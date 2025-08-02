
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { type CancelReservationInput } from '../schema';
import { cancelReservation } from '../handlers/cancel_reservation';
import { eq, and } from 'drizzle-orm';

describe('cancelReservation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          name: 'Test Member',
          email: 'member@test.com',
          role: 'member',
          membership_status: 'active'
        },
        {
          name: 'Test Admin',
          email: 'admin@test.com', 
          role: 'admin',
          membership_status: null
        },
        {
          name: 'Test Instructor',
          email: 'instructor@test.com',
          role: 'instructor',
          membership_status: null
        },
        {
          name: 'Waitlisted Member',
          email: 'waitlisted@test.com',
          role: 'member',
          membership_status: 'active'
        }
      ])
      .returning()
      .execute();

    const member = users[0];
    const admin = users[1];
    const instructor = users[2];
    const waitlistedMember = users[3];

    // Create test gym class
    const gymClasses = await db.insert(gymClassesTable)
      .values({
        name: 'Test Class',
        instructor_id: instructor.id,
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        capacity: 2,
        current_bookings: 1
      })
      .returning()
      .execute();

    const gymClass = gymClasses[0];

    // Create test reservations
    const reservations = await db.insert(reservationsTable)
      .values([
        {
          member_id: member.id,
          class_id: gymClass.id,
          status: 'confirmed'
        },
        {
          member_id: waitlistedMember.id,
          class_id: gymClass.id,
          status: 'waitlisted'
        }
      ])
      .returning()
      .execute();

    return {
      member,
      admin,
      instructor,
      waitlistedMember,
      gymClass,
      confirmedReservation: reservations[0],
      waitlistedReservation: reservations[1]
    };
  };

  it('should allow member to cancel their own reservation', async () => {
    const { member, confirmedReservation } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: member.id
    };

    const result = await cancelReservation(input);

    expect(result.id).toEqual(confirmedReservation.id);
    expect(result.status).toEqual('cancelled');
    expect(result.cancelled_at).toBeInstanceOf(Date);
  });

  it('should allow admin to cancel any reservation', async () => {
    const { admin, confirmedReservation } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: admin.id
    };

    const result = await cancelReservation(input);

    expect(result.id).toEqual(confirmedReservation.id);
    expect(result.status).toEqual('cancelled');
    expect(result.cancelled_at).toBeInstanceOf(Date);
  });

  it('should prevent unauthorized cancellation', async () => {
    const { instructor, confirmedReservation } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: instructor.id
    };

    expect(cancelReservation(input)).rejects.toThrow(/unauthorized/i);
  });

  it('should promote waitlisted member when reservation is cancelled', async () => {
    const { member, confirmedReservation, waitlistedReservation, gymClass } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: member.id
    };

    await cancelReservation(input);

    // Check that waitlisted member was promoted
    const promotedReservations = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, waitlistedReservation.id))
      .execute();

    expect(promotedReservations[0].status).toEqual('confirmed');

    // Verify class booking count remains the same (1 cancelled, 1 promoted)
    const updatedClasses = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, gymClass.id))
      .execute();

    expect(updatedClasses[0].current_bookings).toEqual(1);
  });

  it('should throw error for non-existent reservation', async () => {
    const { member } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: 999,
      user_id: member.id
    };

    expect(cancelReservation(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error for non-existent user', async () => {
    const { confirmedReservation } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: 999
    };

    expect(cancelReservation(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when trying to cancel already cancelled reservation', async () => {
    const { member, confirmedReservation } = await createTestData();

    // First cancellation
    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: member.id
    };

    await cancelReservation(input);

    // Second cancellation should fail
    expect(cancelReservation(input)).rejects.toThrow(/already cancelled/i);
  });

  it('should update gym class current_bookings count correctly', async () => {
    const { member, confirmedReservation, gymClass } = await createTestData();

    const input: CancelReservationInput = {
      reservation_id: confirmedReservation.id,
      user_id: member.id
    };

    await cancelReservation(input);

    // Check that current_bookings was decremented (but then incremented back due to waitlist promotion)
    const updatedClasses = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, gymClass.id))
      .execute();

    // Should be 1 because waitlisted member was promoted
    expect(updatedClasses[0].current_bookings).toEqual(1);
  });
});
