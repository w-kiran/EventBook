import * as argon2 from 'argon2';
import { prisma } from '../src/db/prisma';

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('Please set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Never overwrite the password of an existing account
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log('User already exists. Role set to ADMIN, password unchanged.');
  } else {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.create({ data: { name, email, passwordHash, role: 'ADMIN' } });
    console.log(`Admin created: ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());