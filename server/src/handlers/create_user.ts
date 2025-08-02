
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Validate that membership_status is only set for members
    if (input.role !== 'member' && input.membership_status !== null) {
      throw new Error('Membership status can only be set for members');
    }

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        membership_status: input.membership_status
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
