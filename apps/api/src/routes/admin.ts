import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { toEventDto } from '../lib/event';
import { formatZodError } from '../lib/zod';

export const adminRoutes = Router();

// Every route below this line needs a logged-in admin
adminRoutes.use(requireAuth, requireAdmin);

function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ error: { code, message, details } });
}

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

// --- validation ---

const eventFields = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title is too long'),
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Description is too long'),
  venue: z.string().trim().min(2, 'Venue is required').max(160, 'Venue is too long'),
  // example: 2026-11-20T18:00:00+05:45 (the offset is required)
  startsAt: z
    .string()
    .datetime({ offset: true, message: 'Use a date like 2026-11-20T18:00:00+05:45' })
    .transform((s) => new Date(s))
    .refine((d) => d > new Date(), 'Event date must be in the future'),
  totalSeats: z.number().int('Seats must be a whole number').min(1, 'At least 1 seat').max(100000, 'Too many seats'),
});

const createSchema = eventFields.strict(); // unknown fields (like bookedSeats) are rejected
const updateSchema = eventFields.partial().strict();

// Event Listing Schema
const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  scope: z.enum(['upcoming', 'past', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// Attendee pagination schema
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/admin/events  (includes past events)
adminRoutes.get('/events', async (req, res) => {
  const result = listSchema.safeParse(req.query);
  if (!result.success) {
    fail(res, 422, 'VALIDATION_ERROR', 'Invalid query parameters.', formatZodError(result.error));
    return;
  }
  const { q, scope, page, pageSize } = result.data;
  const now = new Date();

  const where = {
    ...(scope === 'upcoming' ? { startsAt: { gt: now } } : {}),
    ...(scope === 'past' ? { startsAt: { lte: now } } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const [events, totalItems] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ]);

  res.json({
    data: events.map(toEventDto),
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  });
});

// POST /api/admin/events
adminRoutes.post('/events', async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    fail(res, 422, 'VALIDATION_ERROR', 'Some fields are invalid.', formatZodError(result.error));
    return;
  }
  const { title, description, venue, startsAt, totalSeats } = result.data;

  // bookedSeats is not set here, so it starts at 0
  const event = await prisma.event.create({ data: { title, description, venue, startsAt, totalSeats } });
  res.status(201).json({ data: toEventDto(event) });
});

// PATCH /api/admin/events/:id
adminRoutes.patch('/events/:id', async (req, res) => {
  const id = req.params.id;
  if (!isUuid(id)) {
    fail(res, 400, 'INVALID_ID', 'Invalid event id.');
    return;
  }

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    fail(res, 422, 'VALIDATION_ERROR', 'Some fields are invalid.', formatZodError(result.error));
    return;
  }

  const { title, description, venue, startsAt, totalSeats } = result.data;
  
  if (Object.keys(result.data).length === 0) {
    fail(res, 422, 'VALIDATION_ERROR', 'Send at least one field to update.');
    return;
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id } });
    if (!event) return 'NOT_FOUND' as const;
    if (event.startsAt <= new Date()) return 'STARTED' as const;

    // Capacity: only change it if the new total is still enough for the active bookings.
    // The check and the update are one statement, so a booking at the same moment cannot sneak past.
    if (totalSeats !== undefined) {
      const changed = await tx.$executeRaw`
        UPDATE "Event"
        SET "totalSeats" = ${totalSeats}, "updatedAt" = now()
        WHERE id = ${id}::uuid AND "bookedSeats" <= ${totalSeats}`;
      if (changed === 0) return { tooLow: event.bookedSeats };
    }

    // Other fields: only the ones that were sent
    return tx.event.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(venue !== undefined ? { venue } : {}),
        ...(startsAt !== undefined ? { startsAt } : {}),
      },
    });
  });

  if (outcome === 'NOT_FOUND') {
    fail(res, 404, 'EVENT_NOT_FOUND', 'Event not found.');
  } else if (outcome === 'STARTED') {
    fail(res, 409, 'EVENT_STARTED', 'This event has already started and cannot be edited.');
  } else if ('tooLow' in outcome) {
    fail(res, 409, 'CAPACITY_BELOW_BOOKINGS', `Total seats cannot be lower than the ${outcome.tooLow} active bookings.`, {
      activeBookings: outcome.tooLow,
    });
  } else {
    res.json({ data: toEventDto(outcome) });
  }
});

// DELETE /api/admin/events/:id
adminRoutes.delete('/events/:id', async (req, res) => {
  const id = req.params.id;
  if (!isUuid(id)) {
    fail(res, 400, 'INVALID_ID', 'Invalid event id.');
    return;
  }

  // Delete only if nobody has an active booking (bookedSeats counts active bookings).
  // Cancelled bookings of this event are removed together with it.
  const deleted = await prisma.$executeRaw`DELETE FROM "Event" WHERE id = ${id}::uuid AND "bookedSeats" = 0`;

  if (deleted === 1) {
    res.status(204).end();
    return;
  }

  const exists = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    fail(res, 404, 'EVENT_NOT_FOUND', 'Event not found.');
  } else {
    fail(res, 409, 'EVENT_HAS_ACTIVE_BOOKINGS', 'This event has active bookings and cannot be deleted.');
  }
});

// GET /api/admin/events/:id/attendees
adminRoutes.get('/events/:id/attendees', async (req, res) => {
  const id = req.params.id;
  if (!isUuid(id)) {
    fail(res, 400, 'INVALID_ID', 'Invalid event id.');
    return;
  }

  const result = pageSchema.safeParse(req.query);
  if (!result.success) {
    fail(res, 422, 'VALIDATION_ERROR', 'Invalid query parameters.', formatZodError(result.error));
    return;
  }
  const { page, pageSize } = result.data;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) {
    fail(res, 404, 'EVENT_NOT_FOUND', 'Event not found.');
    return;
  }

  const where = { eventId: id, status: 'ACTIVE' as const };

  const [bookings, totalItems] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      // choose the fields explicitly so the password hash can never leak
      select: { id: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    data: bookings.map((b) => ({
      bookingId: b.id,
      userId: b.user.id,
      name: b.user.name,
      email: b.user.email,
      bookedAt: b.createdAt,
    })),
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  });
});