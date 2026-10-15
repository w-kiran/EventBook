import type { Event as EventRow } from '@prisma/client';

export function toEventDto(event: EventRow) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    venue: event.venue,
    startsAt: event.startsAt,
    totalSeats: event.totalSeats,
    bookedSeats: event.bookedSeats,
    availableSeats: event.totalSeats - event.bookedSeats,
    hasStarted: event.startsAt <= new Date(),
  };
}