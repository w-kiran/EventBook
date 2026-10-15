import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { optionalAuth } from '../middleware/auth';
import { toEventDto } from '../lib/event';
import { formatZodError } from '../lib/zod';

export const eventRoutes = Router();

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// GET /api/events?q=meetup&page=1&pageSize=10
eventRoutes.get('/', async (req, res) => {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters.', details: formatZodError(result.error) },
    });
    return;
  }
  const { q, page, pageSize } = result.data;

  // only upcoming events; optional case-insensitive title search
  const where = {
    startsAt: { gt: new Date() },
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const [events, totalItems] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], // id breaks ties so pages are stable
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

// GET /api/events/:id
eventRoutes.get('/:id', optionalAuth, async (req, res) => {
  const id = req.params.id;

  if (typeof id !== 'string' || !z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid event id.' } });
    return;
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    res.status(404).json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
    return;
  }

  // If the visitor is logged in, tell them whether they already booked this event
  let viewerBooking = null;
  if (req.user) {
    viewerBooking = await prisma.booking.findFirst({
      where: { userId: req.user.id, eventId: id, status: 'ACTIVE' },
      select: { id: true, status: true },
    });
  }

  res.json({ data: { ...toEventDto(event), viewerBooking } });
});