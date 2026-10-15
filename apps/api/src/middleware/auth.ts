import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

export const COOKIE_NAME = 'eb_session';

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please log in.' } });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Session expired. Please log in again.' } });
    return;
  }

  // Always read the user (and role) from the database, never from the token.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please log in.' } });
    return;
  }

  req.user = user;
  next();
};