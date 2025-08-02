
import { db } from '../db';
import { gymClassesTable, usersTable } from '../db/schema';
import { type UpdateGymClassInput, type GymClass } from '../schema';
import { eq } from 'drizzle-orm';

export const updateGymClass = async (input: UpdateGymClassInput): Promise<GymClass> => {
  try {
    // First, check if the gym class exists
    const existingClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, input.id))
      .execute();

    if (existingClass.length === 0) {
      throw new Error(`Gym class with id ${input.id} not found`);
    }

    // If instructor_id is being updated, verify the instructor exists and has the correct role
    if (input.instructor_id !== undefined) {
      const instructor = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.instructor_id))
        .execute();

      if (instructor.length === 0) {
        throw new Error(`Instructor with id ${input.instructor_id} not found`);
      }

      if (instructor[0].role !== 'instructor') {
        throw new Error(`User with id ${input.instructor_id} is not an instructor`);
      }
    }

    // Validate time constraints if both start_time and end_time are provided
    if (input.start_time && input.end_time) {
      if (input.start_time >= input.end_time) {
        throw new Error('Start time must be before end time');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.instructor_id !== undefined) {
      updateData.instructor_id = input.instructor_id;
    }
    if (input.start_time !== undefined) {
      updateData.start_time = input.start_time;
    }
    if (input.end_time !== undefined) {
      updateData.end_time = input.end_time;
    }
    if (input.capacity !== undefined) {
      updateData.capacity = input.capacity;
    }

    // Update the gym class
    const result = await db.update(gymClassesTable)
      .set(updateData)
      .where(eq(gymClassesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Gym class update failed:', error);
    throw error;
  }
};
