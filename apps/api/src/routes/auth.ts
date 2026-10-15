import { Router, Response } from 'express';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { COOKIE_NAME, requireAuth } from '../middleware/auth';
import { formatZodError } from '../lib/zod';

export const authRoutes = Router();

const SEVEN_DAYS = 7 * 24 * 60 * 60; // seconds

const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const,
  path: '/',
};

// Basic protection against password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function startSession(res: Response, userId: string) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: SEVEN_DAYS });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SEVEN_DAYS * 1000 });
}

function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

authRoutes.post('/register', authLimiter, async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid.', details: formatZodError(result.error) },
    });
    return;
  }
  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } });
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  // role is not set here, so the database default (USER) is used
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  startSession(res, user.id);
  res.status(201).json({ data: publicUser(user) });
});

authRoutes.post('/login', authLimiter, async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid.', details: formatZodError(result.error) },
    });
    return;
  }
  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user ? await argon2.verify(user.passwordHash, password) : false;

  // Same message for "no such email" and "wrong password"
  if (!user || !passwordOk) {
    res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    return;
  }

  startSession(res, user.id);
  res.json({ data: publicUser(user) });
});

authRoutes.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ data: req.user });
});