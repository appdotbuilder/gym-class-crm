
import { db } from '../db';
import { gymClassesTable, usersTable } from '../db/schema';
import { type GetGymClassByIdInput, type GymClass } from '../schema';
import { eq } from 'drizzle-orm';

export async function getGymClassById(input: GetGymClassByIdInput): Promise<GymClass | null> {
  try {
    // Query gym class with instructor information
    const results = await db.select()
      .from(gymClassesTable)
      .innerJoin(usersTable, eq(gymClassesTable.instructor_id, usersTable.id))
      .where(eq(gymClassesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Extract gym class data from joined result
    const result = results[0];
    const gymClassData = result.gym_classes;
    
    return {
      id: gymClassData.id,
      name: gymClassData.name,
      instructor_id: gymClassData.instructor_id,
      start_time: gymClassData.start_time,
      end_time: gymClassData.end_time,
      capacity: gymClassData.capacity,
      current_bookings: gymClassData.current_bookings,
      is_cancelled: gymClassData.is_cancelled,
      created_at: gymClassData.created_at,
      updated_at: gymClassData.updated_at
    };
  } catch (error) {
    console.error('Failed to get gym class by ID:', error);
    throw error;
  }
}
