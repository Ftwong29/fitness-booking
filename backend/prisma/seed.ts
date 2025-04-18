// prisma/seed.ts
import 'bun:dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database:', process.env.DATABASE_URL);

  // Clear old data
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.instructor.deleteMany();

  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`🔐 Using test password: ${password}`);

  // Create users (with roles and hashed passwords)
  await prisma.user.createMany({
    data: [
      { name: 'Alice', email: 'alice@example.com', phoneNumber: '1111111111', passwordHash, role: 'admin' },
      { name: 'Bob', email: 'bob@example.com', phoneNumber: '2222222222', passwordHash, role: 'user' },
      { name: 'Charlie', email: 'charlie@example.com', phoneNumber: '3333333333', passwordHash, role: 'user' }
    ]
  });

  // Create instructors
  await prisma.instructor.createMany({
    data: [
      { name: 'Coach Alex', email: 'alex@fit.com', phoneNumber: '4444444444', ratePerHour: 100 },
      { name: 'Coach Mira', email: 'mira@fit.com', phoneNumber: '5555555555', ratePerHour: 120 },
      { name: 'Coach Sam', email: 'sam@fit.com', phoneNumber: '6666666666', ratePerHour: 110 },
      { name: 'Coach Lily', email: 'lily@fit.com', phoneNumber: '7777777777', ratePerHour: 130 },
      { name: 'Coach John', email: 'john@fit.com', phoneNumber: '8888888888', ratePerHour: 90 }
    ]
  });

  // Create workout machines
  await prisma.machine.createMany({
    data: [
      { machineType: 'Treadmill', location: 'Zone A', latitude: 3.15, longitude: 101.7, description: 'High-speed treadmill' },
      { machineType: 'Elliptical', location: 'Zone B', latitude: 3.151, longitude: 101.702, description: 'Low-impact elliptical' },
      { machineType: 'Rowing Machine', location: 'Zone C', latitude: 3.1495, longitude: 101.699, description: 'Water resistance rower' },
      { machineType: 'Stationary Bike', location: 'Zone D', latitude: 3.152, longitude: 101.703, description: 'Upright cardio bike' },
      { machineType: 'Stair Climber', location: 'Zone E', latitude: 3.153, longitude: 101.704, description: 'Leg endurance trainer' }
    ]
  });

  console.log('✅ Seed completed: users, instructors, machines.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
