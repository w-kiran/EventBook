import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

export const COOKIE_NAME = 'eb_session';

// Returns the logged-in user, or null if there is no valid session
async function loadUser(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  let userId: string;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    userId = payload.userId;
  } catch {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
}

// Rejects the request if nobody is logged in
export const requireAuth: RequestHandler = async (req, res, next) => {
  const user = await loadUser(req);
  if (!user) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please log in.' } });
    return;
  }
  req.user = user;
  next();
};

// Lets everyone through; fills req.user only if logged in
export const optionalAuth: RequestHandler = async (req, res, next) => {
  const user = await loadUser(req);
  if (user) req.user = user;
  next();
};