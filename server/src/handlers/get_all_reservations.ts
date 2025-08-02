
import { db } from '../db';
import { reservationsTable, usersTable, gymClassesTable } from '../db/schema';
import { type Reservation } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAllReservations(): Promise<Reservation[]> {
  try {
    // Join reservations with member and class details
    const results = await db.select({
      id: reservationsTable.id,
      member_id: reservationsTable.member_id,
      class_id: reservationsTable.class_id,
      status: reservationsTable.status,
      reserved_at: reservationsTable.reserved_at,
      cancelled_at: reservationsTable.cancelled_at
    })
    .from(reservationsTable)
    .innerJoin(usersTable, eq(reservationsTable.member_id, usersTable.id))
    .innerJoin(gymClassesTable, eq(reservationsTable.class_id, gymClassesTable.id))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all reservations:', error);
    throw error;
  }
}
