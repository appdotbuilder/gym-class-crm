
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserById = async (input: GetUserByIdInput): Promise<User | null> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Get user by ID failed:', error);
    throw error;
  }
};
