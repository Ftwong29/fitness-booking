import { Elysia } from 'elysia';
import { verifyToken } from '../helper/utils/verifySimpleToken';

// Create a route group for /users endpoints
export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', async ({ headers, set }) => {
    // Extract token from Authorization header
    const token = headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;

    // Reject request if token is missing or invalid
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // ❗ Optional: role-based access control (only allow admins)
    if (user.role !== 'admin') {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Return the authenticated user (as an array for consistency or future expansion)
    return [user];
  });
