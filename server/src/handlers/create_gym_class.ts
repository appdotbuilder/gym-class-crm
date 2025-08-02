
import { db } from '../db';
import { gymClassesTable, usersTable } from '../db/schema';
import { type CreateGymClassInput, type GymClass } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createGymClass(input: CreateGymClassInput): Promise<GymClass> {
  try {
    // Validate that instructor exists and has instructor role
    const instructor = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, input.instructor_id),
          eq(usersTable.role, 'instructor')
        )
      )
      .execute();

    if (instructor.length === 0) {
      throw new Error('Instructor not found or user is not an instructor');
    }

    // Validate that start_time is before end_time
    if (input.start_time >= input.end_time) {
      throw new Error('Start time must be before end time');
    }

    // Insert gym class record
    const result = await db.insert(gymClassesTable)
      .values({
        name: input.name,
        instructor_id: input.instructor_id,
        start_time: input.start_time,
        end_time: input.end_time,
        capacity: input.capacity,
        current_bookings: 0,
        is_cancelled: false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Gym class creation failed:', error);
    throw error;
  }
}
