
import { db } from '../db';
import { reservationsTable, gymClassesTable, usersTable } from '../db/schema';
import { type GetReservationsByMemberInput, type Reservation } from '../schema';
import { eq } from 'drizzle-orm';

export const getReservationsByMember = async (input: GetReservationsByMemberInput): Promise<Reservation[]> => {
  try {
    // Query reservations with gym class details using inner join
    const results = await db.select({
      id: reservationsTable.id,
      member_id: reservationsTable.member_id,
      class_id: reservationsTable.class_id,
      status: reservationsTable.status,
      reserved_at: reservationsTable.reserved_at,
      cancelled_at: reservationsTable.cancelled_at
    })
    .from(reservationsTable)
    .innerJoin(gymClassesTable, eq(reservationsTable.class_id, gymClassesTable.id))
    .where(eq(reservationsTable.member_id, input.member_id))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get reservations by member:', error);
    throw error;
  }
};
