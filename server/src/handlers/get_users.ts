
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

const validRoles = ['member', 'instructor', 'admin'] as const;

export const getUsers = async (role?: string): Promise<User[]> => {
  try {
    // If role is provided, validate it against allowed enum values
    if (role && !validRoles.includes(role as any)) {
      return []; // Return empty array for invalid roles
    }

    // Build query without conditionally reassigning to maintain type inference
    const results = role
      ? await db.select().from(usersTable).where(eq(usersTable.role, role as any)).execute()
      : await db.select().from(usersTable).execute();
    
    // Return users as-is since no numeric conversions needed
    return results;
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};
