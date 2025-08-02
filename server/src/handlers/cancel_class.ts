
import { db } from '../db';
import { gymClassesTable, reservationsTable } from '../db/schema';
import { type CancelClassInput, type GymClass } from '../schema';
import { eq, and } from 'drizzle-orm';

export const cancelClass = async (input: CancelClassInput): Promise<GymClass> => {
  try {
    // Start a transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
      // Update the gym class to cancelled status
      const updatedClasses = await tx.update(gymClassesTable)
        .set({ 
          is_cancelled: true,
          updated_at: new Date()
        })
        .where(eq(gymClassesTable.id, input.class_id))
        .returning()
        .execute();

      if (updatedClasses.length === 0) {
        throw new Error(`Gym class with id ${input.class_id} not found`);
      }

      // Cancel all confirmed reservations for this class
      await tx.update(reservationsTable)
        .set({ 
          status: 'cancelled',
          cancelled_at: new Date()
        })
        .where(
          and(
            eq(reservationsTable.class_id, input.class_id),
            eq(reservationsTable.status, 'confirmed')
          )
        )
        .execute();

      // Reset current bookings to 0 since all reservations are now cancelled
      const finalUpdatedClasses = await tx.update(gymClassesTable)
        .set({ 
          current_bookings: 0,
          updated_at: new Date()
        })
        .where(eq(gymClassesTable.id, input.class_id))
        .returning()
        .execute();

      return finalUpdatedClasses[0];
    });

    return result;
  } catch (error) {
    console.error('Class cancellation failed:', error);
    throw error;
  }
};
