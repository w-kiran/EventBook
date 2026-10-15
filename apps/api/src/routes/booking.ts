import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { formatZodError } from '../lib/zod';

export const bookingRoutes = Router();

// Thrown on purpose when a business rule is broken
class BookingError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// Sends BookingError as a normal JSON error; anything else is an unexpected 500
function sendError(res: Response, err: unknown) {
  if (err instanceof BookingError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

// POST /api/events/:id/bookings  -> book one seat
bookingRoutes.post('/events/:id/bookings', requireAuth, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user!.id; // always from the login cookie, never from the request body

  if (typeof eventId !== 'string' || !isUuid(eventId)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid event id.' } });
    return;
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Step 1: take one seat, only if the event has not started and is not full.
      // This single statement locks the event row, so two requests cannot both get the last seat.
      const updated = await tx.$executeRaw`
        UPDATE "Event"
        SET "bookedSeats" = "bookedSeats" + 1, "updatedAt" = now()
        WHERE id = ${eventId}::uuid
          AND "startsAt" > now()
          AND "bookedSeats" < "totalSeats"`;

      if (updated === 0) {
        // No row changed: find out why, to give a clear message
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new BookingError(404, 'EVENT_NOT_FOUND', 'Event not found.');
        if (event.startsAt <= new Date()) throw new BookingError(409, 'EVENT_STARTED', 'This event has already started.');
        throw new BookingError(409, 'EVENT_FULL', 'This event is fully booked.');
      }

      // Step 2: create the booking. The unique index rejects a second ACTIVE booking
      // for the same user and event. The error rolls back step 1 as well.
      try {
        return await tx.booking.create({
          data: { userId, eventId },
          select: { id: true, status: true, eventId: true, createdAt: true },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new BookingError(409, 'ALREADY_BOOKED', 'You have already booked this event.');
        }
        throw err;
      }
    });

    res.status(201).json({ data: booking });
  } catch (err) {
    sendError(res, err);
  }
});

const myBookingsSchema = z.object({
  status: z.enum(['active', 'cancelled', 'all']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// GET /api/bookings/me?status=active&page=1
bookingRoutes.get('/bookings/me', requireAuth, async (req, res) => {
  const result = myBookingsSchema.safeParse(req.query);
  if (!result.success) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters.', details: formatZodError(result.error) },
    });
    return;
  }
  const { status, page, pageSize } = result.data;

  const where = {
    userId: req.user!.id, // only my own bookings
    ...(status === 'active' ? { status: 'ACTIVE' as const } : {}),
    ...(status === 'cancelled' ? { status: 'CANCELLED' as const } : {}),
  };

  const [bookings, totalItems] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { event: { select: { id: true, title: true, venue: true, startsAt: true } } },
    }),
    prisma.booking.count({ where }),
  ]);

  const now = new Date();
  res.json({
    data: bookings.map((b) => {
      const hasStarted = b.event.startsAt <= now;
      return {
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        cancelledAt: b.cancelledAt,
        canCancel: b.status === 'ACTIVE' && !hasStarted,
        event: { ...b.event, hasStarted },
      };
    }),
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  });
});

// POST /api/bookings/:id/cancel
bookingRoutes.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user!.id;

  if (typeof bookingId !== 'string' || !isUuid(bookingId)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid booking id.' } });
    return;
  }

  try {
    const cancelled = await prisma.$transaction(async (tx) => {
      // Cancel only if: it is my booking, it is still ACTIVE, and the event has not started.
      const rows = await tx.$queryRaw<{ eventId: string; cancelledAt: Date }[]>`
        UPDATE "Booking"
        SET "status" = 'CANCELLED', "cancelledAt" = now(), "updatedAt" = now()
        WHERE id = ${bookingId}::uuid
          AND "userId" = ${userId}::uuid
          AND "status" = 'ACTIVE'
          AND "eventId" IN (SELECT id FROM "Event" WHERE "startsAt" > now())
        RETURNING "eventId", "cancelledAt"`;

      if (rows.length === 0) {
        // Nothing was cancelled: find out why
        const booking = await tx.booking.findUnique({ where: { id: bookingId } });
        // Someone else's booking looks the same as a missing one, so we do not reveal it exists
        if (!booking || booking.userId !== userId) {
          throw new BookingError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
        }
        if (booking.status === 'CANCELLED') {
          throw new BookingError(409, 'ALREADY_CANCELLED', 'This booking is already cancelled.');
        }
        throw new BookingError(409, 'EVENT_STARTED', 'This event has already started, so the booking cannot be cancelled.');
      }

      // Give the seat back
      await tx.$executeRaw`
        UPDATE "Event"
        SET "bookedSeats" = "bookedSeats" - 1, "updatedAt" = now()
        WHERE id = ${rows[0].eventId}::uuid`;

      return rows[0];
    });

    res.json({ data: { id: bookingId, status: 'CANCELLED', cancelledAt: cancelled.cancelledAt } });
  } catch (err) {
    sendError(res, err);
  }
});