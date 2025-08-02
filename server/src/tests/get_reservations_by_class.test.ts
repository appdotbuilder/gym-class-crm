
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { type GetReservationsByClassInput } from '../schema';
import { getReservationsByClass } from '../handlers/get_reservations_by_class';

describe('getReservationsByClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return reservations for a specific class', async () => {
    // Create test instructor
    const instructor = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        role: 'instructor',
        phone: '123-456-7890'
      })
      .returning()
      .execute();

    // Create test members
    const member1 = await db.insert(usersTable)
      .values({
        name: 'Member One',
        email: 'member1@test.com',
        role: 'member',
        membership_status: 'active',
        phone: '123-456-7891'
      })
      .returning()
      .execute();

    const member2 = await db.insert(usersTable)
      .values({
        name: 'Member Two',
        email: 'member2@test.com',
        role: 'member',
        membership_status: 'active',
        phone: '123-456-7892'
      })
      .returning()
      .execute();

    // Create test gym class
    const gymClass = await db.insert(gymClassesTable)
      .values({
        name: 'Test Class',
        instructor_id: instructor[0].id,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        capacity: 20
      })
      .returning()
      .execute();

    // Create test reservations
    const reservation1 = await db.insert(reservationsTable)
      .values({
        member_id: member1[0].id,
        class_id: gymClass[0].id,
        status: 'confirmed'
      })
      .returning()
      .execute();

    const reservation2 = await db.insert(reservationsTable)
      .values({
        member_id: member2[0].id,
        class_id: gymClass[0].id,
        status: 'confirmed'
      })
      .returning()
      .execute();

    // Test the handler
    const input: GetReservationsByClassInput = {
      class_id: gymClass[0].id
    };

    const result = await getReservationsByClass(input);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Sort results by id for consistent testing
    result.sort((a, b) => a.id - b.id);

    expect(result[0].id).toEqual(reservation1[0].id);
    expect(result[0].member_id).toEqual(member1[0].id);
    expect(result[0].class_id).toEqual(gymClass[0].id);
    expect(result[0].status).toEqual('confirmed');
    expect(result[0].reserved_at).toBeInstanceOf(Date);
    expect(result[0].cancelled_at).toBeNull();

    expect(result[1].id).toEqual(reservation2[0].id);
    expect(result[1].member_id).toEqual(member2[0].id);
    expect(result[1].class_id).toEqual(gymClass[0].id);
    expect(result[1].status).toEqual('confirmed');
    expect(result[1].reserved_at).toBeInstanceOf(Date);
    expect(result[1].cancelled_at).toBeNull();
  });

  it('should return empty array for class with no reservations', async () => {
    // Create test instructor
    const instructor = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        role: 'instructor',
        phone: '123-456-7890'
      })
      .returning()
      .execute();

    // Create test gym class with no reservations
    const gymClass = await db.insert(gymClassesTable)
      .values({
        name: 'Empty Class',
        instructor_id: instructor[0].id,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        capacity: 20
      })
      .returning()
      .execute();

    const input: GetReservationsByClassInput = {
      class_id: gymClass[0].id
    };

    const result = await getReservationsByClass(input);

    expect(result).toHaveLength(0);
  });

  it('should include cancelled reservations', async () => {
    // Create test instructor
    const instructor = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        role: 'instructor',
        phone: '123-456-7890'
      })
      .returning()
      .execute();

    // Create test member
    const member = await db.insert(usersTable)
      .values({
        name: 'Test Member',
        email: 'member@test.com',
        role: 'member',
        membership_status: 'active',
        phone: '123-456-7891'
      })
      .returning()
      .execute();

    // Create test gym class
    const gymClass = await db.insert(gymClassesTable)
      .values({
        name: 'Test Class',
        instructor_id: instructor[0].id,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        capacity: 20
      })
      .returning()
      .execute();

    // Create cancelled reservation
    const cancelledAt = new Date('2024-01-01T09:00:00Z');
    await db.insert(reservationsTable)
      .values({
        member_id: member[0].id,
        class_id: gymClass[0].id,
        status: 'cancelled',
        cancelled_at: cancelledAt
      })
      .returning()
      .execute();

    const input: GetReservationsByClassInput = {
      class_id: gymClass[0].id
    };

    const result = await getReservationsByClass(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('cancelled');
    expect(result[0].cancelled_at).toBeInstanceOf(Date);
    expect(result[0].cancelled_at?.getTime()).toEqual(cancelledAt.getTime());
  });
});
