import { exec } from 'child_process';
import { promisify } from 'util';
import { chmodSync } from 'fs';
import path from 'path';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Resolve project root (1 level up from this script)
const projectRoot = path.resolve(__dirname, '..');

// Full path to the SQLite database file
const dbPath = path.join(projectRoot, 'prisma', 'dev.db');

async function reset() {
  console.log('🧹 Resetting database...');

  try {
    // Delete existing dev.db (if exists)
    await execAsync('rm -f prisma/dev.db', { cwd: projectRoot });
    console.log('✅ Deleted old dev.db');
  } catch {
    // Safe to ignore if file is not found
    console.warn('⚠️ dev.db not found, skipping deletion');
  }

  console.log('🔧 Pushing Prisma schema...');
  // Recreate database using current schema
  await execAsync('bunx prisma db push', { cwd: projectRoot });

  console.log('🌱 Running seed...');
  // Run custom seed script (TypeScript file)
  await execAsync('bun run prisma/seed.ts', { cwd: projectRoot });

  try {
    // Ensure the database file is writable (for development environments)
    chmodSync(dbPath, 0o644);
    console.log('🔐 Updated dev.db to writable mode');
  } catch (err) {
    console.warn('⚠️ Failed to set dev.db permissions:', err);
  }

  console.log('✅ Database reset and seeded successfully');
}

// Execute the reset flow
reset().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
