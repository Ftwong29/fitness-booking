// src/routes/bookings.ts
import { Elysia, t } from 'elysia'; // Elysia is the lightweight HTTP framework used
import { PrismaClient } from '@prisma/client'; // Prisma ORM for database access
import { z } from 'zod'; // zod used for input validation

const prisma = new PrismaClient();
const router = new Elysia({ prefix: '/bookings' });

// Booking request payload validation schema
const bookingSchema = z.object({
  userId: z.number(),
  machineId: z.number(),
  instructorId: z.number(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use ISO string (e.g. 2025-04-17T15:00:00Z)"
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use ISO string (e.g. 2025-04-17T15:00:00Z)"
  })
});

// GET /bookings — List all bookings with related entities
router.get('/', async () => {
  const bookings = await prisma.booking.findMany({
    orderBy: { startTime: 'asc' }, // Sorted by start time
    include: {
      user: true,
      instructor: true,
      machine: true
    }
  });

  return bookings;
});

// POST /bookings — Create a new booking with conflict detection
router.post('/', async ({ body, set }) => {
  const parsed = bookingSchema.safeParse(body);

  // Return 400 if input fails validation
  if (!parsed.success) {
    set.status = 400;
    return { error: parsed.error.errors };
  }

  const { userId, machineId, instructorId, startTime, endTime } = parsed.data;
  const start = new Date(startTime);
  const end = new Date(endTime);

  console.log('📥 New booking request', {
    userId,
    machineId,
    instructorId,
    startTime,
    endTime
  });

  // Step 1: Check for time conflicts involving the same machine or instructor
  const conflicts = await prisma.booking.findMany({
    where: {
      OR: [
        {
          machineId,
          startTime: { lt: end },
          endTime: { gt: start }
        },
        {
          instructorId,
          startTime: { lt: end },
          endTime: { gt: start }
        }
      ]
    },
    take: 1 // only return first conflict
  });

  if (conflicts.length > 0) {
    const conflict = conflicts[0];

    // Identify what caused the conflict
    const reason = conflict.machineId === machineId && conflict.instructorId === instructorId
      ? 'machine+instructor'
      : conflict.machineId === machineId
        ? 'machine'
        : 'instructor';

    set.status = 409; // Conflict status code
    console.log('❌ Conflict detected:', {
      conflictId: conflict.id,
      conflictStart: conflict.startTime,
      conflictEnd: conflict.endTime,
      machineId: conflict.machineId,
      instructorId: conflict.instructorId
    });
    return {
      error: 'Time slot conflicts with existing booking',
      reason,
      conflictBookingId: conflict.id
    };
  }

  // Step 2: Enforce cooldown rule — machine must have a 10-min gap between bookings
  const cooldown = await prisma.booking.findFirst({
    where: {
      machineId,
      OR: [
        {
          endTime: {
            gt: new Date(start.getTime() - 10 * 60 * 1000) // Ends too close before
          },
          startTime: { lt: start }
        },
        {
          startTime: {
            lt: new Date(end.getTime() + 10 * 60 * 1000), // Starts too close after
            gt: end
          }
        }
      ]
    }
  });

  if (cooldown) {
    set.status = 409;
    console.log('❌ Cooldown conflict:', {
      conflictId: cooldown.id,
      conflictStart: cooldown.startTime,
      conflictEnd: cooldown.endTime,
      machineId: cooldown.machineId
    });

    return {
      error: 'Machine needs at least 10 minutes cooldown between bookings',
      reason: 'cooldown',
      conflictBookingId: cooldown.id
    };
  }

  // Step 3: All checks passed — proceed to create booking
  const booking = await prisma.booking.create({
    data: {
      userId,
      machineId,
      instructorId,
      startTime: start,
      endTime: end,
      status: 'confirmed'
    }
  });

  console.log('✅ Booking created:', booking.id);

  return {
    success: true,
    booking
  };
});

export default router;
