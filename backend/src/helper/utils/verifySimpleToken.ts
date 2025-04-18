// helper/utils/verifySimpleToken.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Fallback secret used for token validation (used for simple Base64-based token)
const SECRET_KEY = process.env.SIMPLE_SECRET || 'dev_secret';

/**
 * Verify a base64-encoded token string.
 * Token format: base64("userId.secret")
 * 
 * @param token Encoded token string
 * @returns The user object if valid, otherwise null
 */
export async function verifyToken(token: string) {
  try {
    // Decode the token from base64
    const decoded = Buffer.from(token, 'base64').toString();

    // Split it into userId and secret key
    const [userId, key] = decoded.split('.');

    // Check if secret matches
    if (key !== SECRET_KEY) return null;

    // Look up the user in the database
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    return user;
  } catch {
    // Return null if decoding or user lookup fails
    return null;
  }
}
