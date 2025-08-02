
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { type CreateReservationInput } from '../schema';
import { createReservation } from '../handlers/create_reservation';
import { eq, and } from 'drizzle-orm';

describe('createReservation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let memberId: number;
  let instructorId: number;
  let classId: number;

  beforeEach(async () => {
    // Create test member
    const memberResult = await db.insert(usersTable)
      .values({
        name: 'Test Member',
        email: 'member@test.com',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();
    memberId = memberResult[0].id;

    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        role: 'instructor'
      })
      .returning()
      .execute();
    instructorId = instructorResult[0].id;

    // Create test class
    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Test Class',
        instructor_id: instructorId,
        start_time: new Date('2024-12-01T10:00:00Z'),
        end_time: new Date('2024-12-01T11:00:00Z'),
        capacity: 2,
        current_bookings: 0
      })
      .returning()
      .execute();
    classId = classResult[0].id;
  });

  const testInput: CreateReservationInput = {
    member_id: 0, // Will be set in tests
    class_id: 0   // Will be set in tests
  };

  it('should create a confirmed reservation when class has capacity', async () => {
    const input = { ...testInput, member_id: memberId, class_id: classId };
    const result = await createReservation(input);

    expect(result.member_id).toEqual(memberId);
    expect(result.class_id).toEqual(classId);
    expect(result.status).toEqual('confirmed');
    expect(result.id).toBeDefined();
    expect(result.reserved_at).toBeInstanceOf(Date);
    expect(result.cancelled_at).toBeNull();
  });

  it('should increment class current_bookings for confirmed reservation', async () => {
    const input = { ...testInput, member_id: memberId, class_id: classId };
    await createReservation(input);

    const updatedClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, classId))
      .execute();

    expect(updatedClass[0].current_bookings).toEqual(1);
  });

  it('should create waitlisted reservation when class is at capacity', async () => {
    // Fill class to capacity
    await db.update(gymClassesTable)
      .set({ current_bookings: 2 })
      .where(eq(gymClassesTable.id, classId))
      .execute();

    const input = { ...testInput, member_id: memberId, class_id: classId };
    const result = await createReservation(input);

    expect(result.status).toEqual('waitlisted');

    // Should not increment current_bookings for waitlisted
    const updatedClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, classId))
      .execute();

    expect(updatedClass[0].current_bookings).toEqual(2);
  });

  it('should throw error if member not found', async () => {
    const input = { ...testInput, member_id: 99999, class_id: classId };

    expect(createReservation(input)).rejects.toThrow(/member not found/i);
  });

  it('should throw error if member is not active', async () => {
    // Update member to inactive
    await db.update(usersTable)
      .set({ membership_status: 'inactive' })
      .where(eq(usersTable.id, memberId))
      .execute();

    const input = { ...testInput, member_id: memberId, class_id: classId };

    expect(createReservation(input)).rejects.toThrow(/does not have active membership/i);
  });

  it('should throw error if class not found', async () => {
    const input = { ...testInput, member_id: memberId, class_id: 99999 };

    expect(createReservation(input)).rejects.toThrow(/class not found/i);
  });

  it('should throw error if class is cancelled', async () => {
    // Cancel the class
    await db.update(gymClassesTable)
      .set({ is_cancelled: true })
      .where(eq(gymClassesTable.id, classId))
      .execute();

    const input = { ...testInput, member_id: memberId, class_id: classId };

    expect(createReservation(input)).rejects.toThrow(/cannot book cancelled class/i);
  });

  it('should throw error if member already has reservation for class', async () => {
    const input = { ...testInput, member_id: memberId, class_id: classId };

    // Create first reservation
    await createReservation(input);

    // Try to create duplicate reservation
    expect(createReservation(input)).rejects.toThrow(/already has a reservation/i);
  });

  it('should save reservation to database', async () => {
    const input = { ...testInput, member_id: memberId, class_id: classId };
    const result = await createReservation(input);

    const reservations = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, result.id))
      .execute();

    expect(reservations).toHaveLength(1);
    expect(reservations[0].member_id).toEqual(memberId);
    expect(reservations[0].class_id).toEqual(classId);
    expect(reservations[0].status).toEqual('confirmed');
    expect(reservations[0].reserved_at).toBeInstanceOf(Date);
  });
});
