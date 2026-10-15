import * as argon2 from 'argon2';
import { prisma } from '../src/db/prisma';

const DAY = 24 * 60 * 60 * 1000;

async function createDemoUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return prisma.user.create({ data: { name, email, passwordHash } });
}

async function createEventIfMissing(
  data: { title: string; description: string; venue: string; startsAt: Date; totalSeats: number },
  bookedByUserIds: string[] = [],
) {
  const existing = await prisma.event.findFirst({ where: { title: data.title } });
  if (existing) return;

  await prisma.event.create({
    data: {
      ...data,
      bookedSeats: bookedByUserIds.length,
      bookings: { create: bookedByUserIds.map((userId) => ({ userId })) },
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Demo seed must not run in production.');
    process.exit(1);
  }
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password || password.length < 8) {
    console.error('Set DEMO_USER_PASSWORD (at least 8 characters) in .env');
    process.exit(1);
  }

  const demo1 = await createDemoUser('Demo One', 'demo1@example.com', password);
  const demo2 = await createDemoUser('Demo Two', 'demo2@example.com', password);

  // 25 upcoming events, for testing pagination and search
  const topics = ['Tech Meetup', 'Music Night', 'Art Workshop', 'Startup Pitch', 'Yoga Morning', 'Food Festival', 'Photography Walk', 'Book Club', 'Hackathon', 'Charity Run'];
  const venues = ['Bhrikutimandap, Kathmandu', 'Patan Durbar Square, Lalitpur', 'Lakeside, Pokhara', 'Bhaktapur Cultural Hall', 'Nagarkot Viewpoint'];

  for (let i = 1; i <= 25; i++) {
    await createEventIfMissing({
      title: `${topics[(i - 1) % topics.length]} ${i}`,
      description: `Demo event number ${i}. Come and join us!`,
      venue: venues[i % venues.length],
      startsAt: new Date(Date.now() + i * DAY),
      totalSeats: 20 + (i % 5) * 10,
    });
  }

  // A past event that still has one booking
  await createEventIfMissing(
    {
      title: 'Past Event: Winter Concert',
      description: 'This event has already happened.',
      venue: 'Kathmandu',
      startsAt: new Date(Date.now() - 7 * DAY),
      totalSeats: 50,
    },
    [demo1.id],
  );

  // Nearly full: 3 seats, 2 taken, so one seat is left
  await createEventIfMissing(
    {
      title: 'Almost Full: Poetry Evening',
      description: 'Only one seat left!',
      venue: 'Patan',
      startsAt: new Date(Date.now() + 3 * DAY),
      totalSeats: 3,
    },
    [demo1.id, demo2.id],
  );

  // Completely full
  await createEventIfMissing(
    {
      title: 'Sold Out: Jazz Night',
      description: 'No seats left.',
      venue: 'Thamel, Kathmandu',
      startsAt: new Date(Date.now() + 4 * DAY),
      totalSeats: 2,
    },
    [demo1.id, demo2.id],
  );

  console.log('Demo data ready.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());