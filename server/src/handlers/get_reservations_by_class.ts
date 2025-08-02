
import { db } from '../db';
import { reservationsTable, usersTable } from '../db/schema';
import { type GetReservationsByClassInput, type Reservation } from '../schema';
import { eq } from 'drizzle-orm';

export async function getReservationsByClass(input: GetReservationsByClassInput): Promise<Reservation[]> {
  try {
    // Query reservations for the specific class with member details
    const results = await db.select()
      .from(reservationsTable)
      .innerJoin(usersTable, eq(reservationsTable.member_id, usersTable.id))
      .where(eq(reservationsTable.class_id, input.class_id))
      .execute();

    // Map joined results to Reservation schema format
    return results.map(result => ({
      id: result.reservations.id,
      member_id: result.reservations.member_id,
      class_id: result.reservations.class_id,
      status: result.reservations.status,
      reserved_at: result.reservations.reserved_at,
      cancelled_at: result.reservations.cancelled_at
    }));
  } catch (error) {
    console.error('Failed to get reservations by class:', error);
    throw error;
  }
}
