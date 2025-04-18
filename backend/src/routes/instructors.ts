import { Elysia } from 'elysia';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../helper/utils/verifySimpleToken';

const prisma = new PrismaClient();

// Define instructor routes with prefix "/instructors"
export const instructorRoutes = new Elysia({ prefix: '/instructors' })

  // GET /instructors — Requires authentication
  .get('/', async ({ headers, set }) => {
    // Extract Bearer token from Authorization header
    const token = headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;

    // Reject request if user is not authenticated
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // Optional: Restrict to admin users only
    // Uncomment below to enforce role-based access
    // if (user.role !== 'admin') {
    //   set.status = 403;
    //   return { error: 'Forbidden' };
    // }

    // Return full instructor list
    const instructors = await prisma.instructor.findMany();
    return instructors;
  });
