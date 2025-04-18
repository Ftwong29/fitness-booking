// Load environment variables (e.g., SIMPLE_SECRET)
import 'bun:dotenv';

import { Elysia } from 'elysia';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import bookingRoutes from './src/routes/bookings';
import machineRoutes from './src/routes/machines';
import { userRoutes } from './src/routes/users';
import { instructorRoutes } from './src/routes/instructors';

// Initialize Prisma ORM client
const prisma = new PrismaClient();

// Token secret used for simple base64 auth encoding
const SECRET_KEY = process.env.SIMPLE_SECRET || 'dev_secret';

// Create Elysia app and register route groups
const app = new Elysia()
  .use(userRoutes)
  .use(bookingRoutes)
  .use(instructorRoutes)
  .use(machineRoutes);

// Health check route
app.get('/', () => 'API is running!');

// Login endpoint — returns base64 token if credentials match
app.post('/login', async ({ body, set }) => {
  const { email, password } = body as { email: string; password: string };

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    set.status = 401;
    return { error: 'Invalid credentials' };
  }

  // Compare password with stored hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    set.status = 401;
    return { error: 'Invalid credentials' };
  }

  // Encode user ID and secret key into a base64 token
  const token = Buffer.from(`${user.id}.${SECRET_KEY}`).toString('base64');
  return { token };
});

// Start server
app.listen(3000);
console.log('API running on http://localhost:3000');
