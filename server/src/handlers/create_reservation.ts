
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { type CreateReservationInput, type Reservation } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  try {
    // Validate member exists and has active membership
    const member = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.member_id),
        eq(usersTable.role, 'member')
      ))
      .execute();

    if (member.length === 0) {
      throw new Error('Member not found');
    }

    if (member[0].membership_status !== 'active') {
      throw new Error('Member does not have active membership');
    }

    // Validate class exists and isn't cancelled
    const gymClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, input.class_id))
      .execute();

    if (gymClass.length === 0) {
      throw new Error('Class not found');
    }

    if (gymClass[0].is_cancelled) {
      throw new Error('Cannot book cancelled class');
    }

    // Check for existing reservation to prevent double booking
    const existingReservation = await db.select()
      .from(reservationsTable)
      .where(and(
        eq(reservationsTable.member_id, input.member_id),
        eq(reservationsTable.class_id, input.class_id)
      ))
      .execute();

    if (existingReservation.length > 0) {
      throw new Error('Member already has a reservation for this class');
    }

    // Determine reservation status based on capacity
    const currentClass = gymClass[0];
    const status = currentClass.current_bookings >= currentClass.capacity ? 'waitlisted' : 'confirmed';

    // Create reservation
    const result = await db.insert(reservationsTable)
      .values({
        member_id: input.member_id,
        class_id: input.class_id,
        status: status
      })
      .returning()
      .execute();

    // If confirmed, increment current_bookings
    if (status === 'confirmed') {
      await db.update(gymClassesTable)
        .set({
          current_bookings: currentClass.current_bookings + 1,
          updated_at: new Date()
        })
        .where(eq(gymClassesTable.id, input.class_id))
        .execute();
    }

    return result[0];
  } catch (error) {
    console.error('Reservation creation failed:', error);
    throw error;
  }
}
