import { Elysia } from 'elysia';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const router = new Elysia({ prefix: '/machines' });
const prisma = new PrismaClient();

// Define type for machine with bookings included
type MachineWithBookings = Prisma.MachineGetPayload<{
  include: { bookings: true }
}>;

// Extend machine type to include calculated distance
type MachineWithDistance = MachineWithBookings & {
  distance: number;
};

// Haversine formula to calculate distance between two coordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Define and validate query parameters using zod
const querySchema = z.object({
  page: z.string().optional().transform((v) => parseInt(v ?? '1')),
  limit: z.string().optional().transform((v) => Math.min(parseInt(v ?? '10'), 50)),
  lat: z.string().transform((v) => parseFloat(v)),
  lng: z.string().transform((v) => parseFloat(v)),
  startTime: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid startTime' }),
  endTime: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid endTime' })
});

// GET /machines — returns paginated list of nearest available machines for selected time
router.get('/', async ({ query, set }) => {
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    set.status = 400;
    return { error: parsed.error.flatten() };
  }

  const { page, limit, lat, lng, startTime, endTime } = parsed.data;
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Fetch all machines with bookings that overlap the given time or cooldown window
  const machines = await prisma.machine.findMany({
    include: {
      bookings: {
        where: {
          OR: [
            {
              // Normal booking conflict
              startTime: { lt: end },
              endTime: { gt: start }
            },
            {
              // Cooldown conflict: previous booking ends too close to desired start
              endTime: { gt: new Date(start.getTime() - 10 * 60 * 1000) },
              startTime: { lt: start }
            },
            {
              // Cooldown conflict: next booking starts too soon after desired end
              startTime: {
                lt: new Date(end.getTime() + 10 * 60 * 1000),
                gt: end
              }
            }
          ]
        }
      }
    }
  });

  // Filter out machines with any overlapping bookings or cooldown conflicts
  const availableMachines = machines.filter((m) => m.bookings.length === 0);

  // Calculate distance from user location, sort by nearest, and paginate
  const sorted: MachineWithDistance[] = availableMachines
    .map((m) => ({
      ...m,
      distance: getDistance(lat, lng, m.latitude, m.longitude)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice((page - 1) * limit, page * limit);

  return {
    page,
    limit,
    total: availableMachines.length,
    machines: sorted
  };
});

export default router;
