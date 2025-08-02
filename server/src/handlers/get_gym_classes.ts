
import { db } from '../db';
import { gymClassesTable, usersTable } from '../db/schema';
import { type GymClass } from '../schema';
import { eq } from 'drizzle-orm';

export async function getGymClasses(): Promise<GymClass[]> {
  try {
    // Join gym classes with instructors to get instructor information
    const results = await db.select()
      .from(gymClassesTable)
      .innerJoin(usersTable, eq(gymClassesTable.instructor_id, usersTable.id))
      .execute();

    // Transform results to match GymClass schema
    return results.map(result => ({
      id: result.gym_classes.id,
      name: result.gym_classes.name,
      instructor_id: result.gym_classes.instructor_id,
      start_time: result.gym_classes.start_time,
      end_time: result.gym_classes.end_time,
      capacity: result.gym_classes.capacity,
      current_bookings: result.gym_classes.current_bookings,
      is_cancelled: result.gym_classes.is_cancelled,
      created_at: result.gym_classes.created_at,
      updated_at: result.gym_classes.updated_at
    }));
  } catch (error) {
    console.error('Failed to get gym classes:', error);
    throw error;
  }
}
