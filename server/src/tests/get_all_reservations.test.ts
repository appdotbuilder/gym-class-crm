
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { getAllReservations } from '../handlers/get_all_reservations';

describe('getAllReservations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no reservations exist', async () => {
    const result = await getAllReservations();
    expect(result).toEqual([]);
  });

  it('should return all reservations with proper structure', async () => {
    // Create test member
    const [member] = await db.insert(usersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    // Create test instructor
    const [instructor] = await db.insert(usersTable)
      .values({
        name: 'Instructor Jane',
        email: 'jane@example.com',
        phone: '555-0456',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    // Create test gym class
    const startTime = new Date('2024-01-15T10:00:00Z');
    const endTime = new Date('2024-01-15T11:00:00Z');
    
    const [gymClass] = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        instructor_id: instructor.id,
        start_time: startTime,
        end_time: endTime,
        capacity: 20,
        current_bookings: 1
      })
      .returning()
      .execute();

    // Create test reservation
    const [reservation] = await db.insert(reservationsTable)
      .values({
        member_id: member.id,
        class_id: gymClass.id,
        status: 'confirmed'
      })
      .returning()
      .execute();

    const result = await getAllReservations();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(reservation.id);
    expect(result[0].member_id).toEqual(member.id);
    expect(result[0].class_id).toEqual(gymClass.id);
    expect(result[0].status).toEqual('confirmed');
    expect(result[0].reserved_at).toBeInstanceOf(Date);
    expect(result[0].cancelled_at).toBeNull();
  });

  it('should return multiple reservations with different statuses', async () => {
    // Create test members
    const [member1] = await db.insert(usersTable)
      .values({
        name: 'Member One',
        email: 'member1@example.com',
        phone: '555-0001',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    const [member2] = await db.insert(usersTable)
      .values({
        name: 'Member Two',
        email: 'member2@example.com',
        phone: '555-0002',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    // Create test instructor
    const [instructor] = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@example.com',
        phone: '555-0789',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    // Create test gym classes
    const startTime1 = new Date('2024-01-15T10:00:00Z');
    const endTime1 = new Date('2024-01-15T11:00:00Z');
    const startTime2 = new Date('2024-01-15T14:00:00Z');
    const endTime2 = new Date('2024-01-15T15:00:00Z');
    
    const [gymClass1] = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        instructor_id: instructor.id,
        start_time: startTime1,
        end_time: endTime1,
        capacity: 20,
        current_bookings: 2
      })
      .returning()
      .execute();

    const [gymClass2] = await db.insert(gymClassesTable)
      .values({
        name: 'Afternoon Pilates',
        instructor_id: instructor.id,
        start_time: startTime2,
        end_time: endTime2,
        capacity: 15,
        current_bookings: 1
      })
      .returning()
      .execute();

    // Create reservations with different statuses
    await db.insert(reservationsTable)
      .values([
        {
          member_id: member1.id,
          class_id: gymClass1.id,
          status: 'confirmed'
        },
        {
          member_id: member2.id,
          class_id: gymClass1.id,
          status: 'waitlisted'
        },
        {
          member_id: member1.id,
          class_id: gymClass2.id,
          status: 'cancelled',
          cancelled_at: new Date()
        }
      ])
      .execute();

    const result = await getAllReservations();

    expect(result).toHaveLength(3);
    
    // Check that we have reservations with different statuses
    const statuses = result.map(r => r.status);
    expect(statuses).toContain('confirmed');
    expect(statuses).toContain('waitlisted');
    expect(statuses).toContain('cancelled');

    // Check that cancelled reservation has cancelled_at timestamp
    const cancelledReservation = result.find(r => r.status === 'cancelled');
    expect(cancelledReservation?.cancelled_at).toBeInstanceOf(Date);
  });

  it('should handle reservations with null cancelled_at dates', async () => {
    // Create test member
    const [member] = await db.insert(usersTable)
      .values({
        name: 'Test Member',
        email: 'test@example.com',
        phone: '555-0123',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    // Create test instructor
    const [instructor] = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@example.com',
        phone: '555-0456',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    // Create test gym class
    const startTime = new Date('2024-01-15T10:00:00Z');
    const endTime = new Date('2024-01-15T11:00:00Z');
    
    const [gymClass] = await db.insert(gymClassesTable)
      .values({
        name: 'Test Class',
        instructor_id: instructor.id,
        start_time: startTime,
        end_time: endTime,
        capacity: 10,
        current_bookings: 1
      })
      .returning()
      .execute();

    // Create confirmed reservation (should have null cancelled_at)
    await db.insert(reservationsTable)
      .values({
        member_id: member.id,
        class_id: gymClass.id,
        status: 'confirmed'
      })
      .execute();

    const result = await getAllReservations();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('confirmed');
    expect(result[0].cancelled_at).toBeNull();
  });
});
