
import { db } from '../db';
import { reservationsTable, gymClassesTable, usersTable } from '../db/schema';
import { type CancelReservationInput, type Reservation } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const cancelReservation = async (input: CancelReservationInput): Promise<Reservation> => {
  try {
    // Get the reservation to verify it exists and check authorization
    const existingReservations = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, input.reservation_id))
      .execute();

    if (existingReservations.length === 0) {
      throw new Error('Reservation not found');
    }

    const reservation = existingReservations[0];

    // Check if reservation is already cancelled
    if (reservation.status === 'cancelled') {
      throw new Error('Reservation is already cancelled');
    }

    // Get the user making the request to check authorization
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Authorization check: member can cancel own reservation, admin can cancel any
    if (user.role !== 'admin' && reservation.member_id !== input.user_id) {
      throw new Error('Unauthorized to cancel this reservation');
    }

    // Update the reservation to cancelled status
    const updatedReservations = await db.update(reservationsTable)
      .set({
        status: 'cancelled',
        cancelled_at: new Date()
      })
      .where(eq(reservationsTable.id, input.reservation_id))
      .returning()
      .execute();

    const updatedReservation = updatedReservations[0];

    // Decrement current_bookings in the gym class
    await db.update(gymClassesTable)
      .set({
        current_bookings: sql`${gymClassesTable.current_bookings} - 1`
      })
      .where(eq(gymClassesTable.id, reservation.class_id))
      .execute();

    // Check for waitlisted members to promote
    const waitlistedReservations = await db.select()
      .from(reservationsTable)
      .where(and(
        eq(reservationsTable.class_id, reservation.class_id),
        eq(reservationsTable.status, 'waitlisted')
      ))
      .orderBy(reservationsTable.reserved_at)
      .limit(1)
      .execute();

    // If there's a waitlisted member, promote them
    if (waitlistedReservations.length > 0) {
      const waitlistedReservation = waitlistedReservations[0];
      
      await db.update(reservationsTable)
        .set({
          status: 'confirmed'
        })
        .where(eq(reservationsTable.id, waitlistedReservation.id))
        .execute();

      // Increment current_bookings back up for the promoted member
      await db.update(gymClassesTable)
        .set({
          current_bookings: sql`${gymClassesTable.current_bookings} + 1`
        })
        .where(eq(gymClassesTable.id, reservation.class_id))
        .execute();
    }

    return updatedReservation;
  } catch (error) {
    console.error('Reservation cancellation failed:', error);
    throw error;
  }
};
