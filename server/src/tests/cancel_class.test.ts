
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { type CancelClassInput } from '../schema';
import { cancelClass } from '../handlers/cancel_class';
import { eq, and } from 'drizzle-orm';

describe('cancelClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should cancel a gym class and update all confirmed reservations', async () => {
    // Create prerequisite data - instructor
    const instructors = await db.insert(usersTable)
      .values({
        name: 'John Instructor',
        email: 'john@gym.com',
        role: 'instructor',
        phone: null,
        membership_status: null
      })
      .returning()
      .execute();

    const instructor = instructors[0];

    // Create members
    const members = await db.insert(usersTable)
      .values([
        {
          name: 'Member One',
          email: 'member1@gym.com',
          role: 'member',
          phone: null,
          membership_status: 'active'
        },
        {
          name: 'Member Two',
          email: 'member2@gym.com',
          role: 'member',
          phone: null,
          membership_status: 'active'
        }
      ])
      .returning()
      .execute();

    // Create gym class
    const gymClasses = await db.insert(gymClassesTable)
      .values({
        name: 'Yoga Class',
        instructor_id: instructor.id,
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        capacity: 20,
        current_bookings: 2
      })
      .returning()
      .execute();

    const gymClass = gymClasses[0];

    // Create reservations
    await db.insert(reservationsTable)
      .values([
        {
          member_id: members[0].id,
          class_id: gymClass.id,
          status: 'confirmed'
        },
        {
          member_id: members[1].id,
          class_id: gymClass.id,
          status: 'confirmed'
        }
      ])
      .execute();

    const input: CancelClassInput = {
      class_id: gymClass.id
    };

    // Execute handler
    const result = await cancelClass(input);

    // Verify class is cancelled
    expect(result.id).toEqual(gymClass.id);
    expect(result.is_cancelled).toBe(true);
    expect(result.current_bookings).toEqual(0);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > gymClass.updated_at).toBe(true);

    // Verify class in database
    const updatedClasses = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, gymClass.id))
      .execute();

    expect(updatedClasses).toHaveLength(1);
    expect(updatedClasses[0].is_cancelled).toBe(true);
    expect(updatedClasses[0].current_bookings).toEqual(0);

    // Verify all reservations are cancelled
    const reservations = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.class_id, gymClass.id))
      .execute();

    expect(reservations).toHaveLength(2);
    reservations.forEach(reservation => {
      expect(reservation.status).toEqual('cancelled');
      expect(reservation.cancelled_at).toBeInstanceOf(Date);
    });
  });

  it('should handle classes with mixed reservation statuses', async () => {
    // Create prerequisite data
    const instructors = await db.insert(usersTable)
      .values({
        name: 'Jane Instructor',
        email: 'jane@gym.com',
        role: 'instructor',
        phone: null,
        membership_status: null
      })
      .returning()
      .execute();

    const members = await db.insert(usersTable)
      .values([
        {
          name: 'Member A',
          email: 'membera@gym.com',
          role: 'member',
          phone: null,
          membership_status: 'active'
        },
        {
          name: 'Member B',
          email: 'memberb@gym.com',
          role: 'member',
          phone: null,
          membership_status: 'active'
        },
        {
          name: 'Member C',
          email: 'memberc@gym.com',
          role: 'member',
          phone: null,
          membership_status: 'active'
        }
      ])
      .returning()
      .execute();

    const gymClasses = await db.insert(gymClassesTable)
      .values({
        name: 'Pilates Class',
        instructor_id: instructors[0].id,
        start_time: new Date('2024-01-20T14:00:00Z'),
        end_time: new Date('2024-01-20T15:00:00Z'),
        capacity: 15,
        current_bookings: 2
      })
      .returning()
      .execute();

    // Create reservations with mixed statuses
    await db.insert(reservationsTable)
      .values([
        {
          member_id: members[0].id,
          class_id: gymClasses[0].id,
          status: 'confirmed'
        },
        {
          member_id: members[1].id,
          class_id: gymClasses[0].id,
          status: 'waitlisted'
        },
        {
          member_id: members[2].id,
          class_id: gymClasses[0].id,
          status: 'cancelled',
          cancelled_at: new Date('2024-01-10T12:00:00Z')
        }
      ])
      .execute();

    const input: CancelClassInput = {
      class_id: gymClasses[0].id
    };

    await cancelClass(input);

    // Verify only confirmed reservations were cancelled
    const reservations = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.class_id, gymClasses[0].id))
      .execute();

    const confirmedReservation = reservations.find(r => r.member_id === members[0].id);
    const waitlistedReservation = reservations.find(r => r.member_id === members[1].id);
    const alreadyCancelledReservation = reservations.find(r => r.member_id === members[2].id);

    // Confirmed reservation should now be cancelled
    expect(confirmedReservation?.status).toEqual('cancelled');
    expect(confirmedReservation?.cancelled_at).toBeInstanceOf(Date);

    // Waitlisted reservation should remain waitlisted
    expect(waitlistedReservation?.status).toEqual('waitlisted');
    expect(waitlistedReservation?.cancelled_at).toBeNull();

    // Already cancelled reservation should remain unchanged
    expect(alreadyCancelledReservation?.status).toEqual('cancelled');
    expect(alreadyCancelledReservation?.cancelled_at).toEqual(new Date('2024-01-10T12:00:00Z'));
  });

  it('should handle classes with no reservations', async () => {
    // Create instructor
    const instructors = await db.insert(usersTable)
      .values({
        name: 'Bob Instructor',
        email: 'bob@gym.com',
        role: 'instructor',
        phone: null,
        membership_status: null
      })
      .returning()
      .execute();

    // Create gym class with no reservations
    const gymClasses = await db.insert(gymClassesTable)
      .values({
        name: 'Empty Class',
        instructor_id: instructors[0].id,
        start_time: new Date('2024-01-25T16:00:00Z'),
        end_time: new Date('2024-01-25T17:00:00Z'),
        capacity: 10,
        current_bookings: 0
      })
      .returning()
      .execute();

    const input: CancelClassInput = {
      class_id: gymClasses[0].id
    };

    const result = await cancelClass(input);

    // Verify class is cancelled
    expect(result.is_cancelled).toBe(true);
    expect(result.current_bookings).toEqual(0);

    // Verify no reservations exist for this class
    const reservations = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.class_id, gymClasses[0].id))
      .execute();

    expect(reservations).toHaveLength(0);
  });

  it('should throw error for non-existent class', async () => {
    const input: CancelClassInput = {
      class_id: 99999
    };

    expect(cancelClass(input)).rejects.toThrow(/not found/i);
  });
});
