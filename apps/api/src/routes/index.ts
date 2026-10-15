import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authRoutes } from './auth';
import { eventRoutes } from './events';
import { bookingRoutes } from './booking';

export const routes = Router();

routes.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok', db: 'up' } });
  } catch (err) {
    res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Database unreachable.' } });
  }
});

routes.use('/auth', authRoutes);
routes.use('/events', eventRoutes);
routes.use('/', bookingRoutes);