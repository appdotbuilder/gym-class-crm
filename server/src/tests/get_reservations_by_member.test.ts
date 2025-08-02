
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable, reservationsTable } from '../db/schema';
import { type GetReservationsByMemberInput } from '../schema';
import { getReservationsByMember } from '../handlers/get_reservations_by_member';

describe('getReservationsByMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return reservations for a specific member', async () => {
    // Create test member
    const memberResult = await db.insert(usersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    const memberId = memberResult[0].id;

    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987-654-3210',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    const instructorId = instructorResult[0].id;

    // Create test gym class
    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Yoga Class',
        instructor_id: instructorId,
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        capacity: 20
      })
      .returning()
      .execute();

    const classId = classResult[0].id;

    // Create test reservations
    await db.insert(reservationsTable)
      .values([
        {
          member_id: memberId,
          class_id: classId,
          status: 'confirmed'
        },
        {
          member_id: memberId,
          class_id: classId,
          status: 'cancelled',
          cancelled_at: new Date()
        }
      ])
      .execute();

    const input: GetReservationsByMemberInput = {
      member_id: memberId
    };

    const result = await getReservationsByMember(input);

    expect(result).toHaveLength(2);
    
    // Verify reservation details
    const confirmedReservation = result.find(r => r.status === 'confirmed');
    const cancelledReservation = result.find(r => r.status === 'cancelled');

    expect(confirmedReservation).toBeDefined();
    expect(confirmedReservation!.member_id).toEqual(memberId);
    expect(confirmedReservation!.class_id).toEqual(classId);
    expect(confirmedReservation!.status).toEqual('confirmed');
    expect(confirmedReservation!.reserved_at).toBeInstanceOf(Date);
    expect(confirmedReservation!.cancelled_at).toBeNull();

    expect(cancelledReservation).toBeDefined();
    expect(cancelledReservation!.member_id).toEqual(memberId);
    expect(cancelledReservation!.class_id).toEqual(classId);
    expect(cancelledReservation!.status).toEqual('cancelled');
    expect(cancelledReservation!.reserved_at).toBeInstanceOf(Date);
    expect(cancelledReservation!.cancelled_at).toBeInstanceOf(Date);
  });

  it('should return empty array when member has no reservations', async () => {
    // Create test member with no reservations
    const memberResult = await db.insert(usersTable)
      .values({
        name: 'No Reservations User',
        email: 'noreservations@example.com',
        phone: null,
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    const input: GetReservationsByMemberInput = {
      member_id: memberResult[0].id
    };

    const result = await getReservationsByMember(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent member', async () => {
    const input: GetReservationsByMemberInput = {
      member_id: 99999
    };

    const result = await getReservationsByMember(input);

    expect(result).toHaveLength(0);
  });

  it('should return reservations with different statuses', async () => {
    // Create test member
    const memberResult = await db.insert(usersTable)
      .values({
        name: 'Multi Status User',
        email: 'multistatus@example.com',
        phone: null,
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();

    const memberId = memberResult[0].id;

    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@example.com',
        phone: null,
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    const instructorId = instructorResult[0].id;

    // Create test gym classes
    const classResults = await db.insert(gymClassesTable)
      .values([
        {
          name: 'Class 1',
          instructor_id: instructorId,
          start_time: new Date('2024-01-15T10:00:00Z'),
          end_time: new Date('2024-01-15T11:00:00Z'),
          capacity: 20
        },
        {
          name: 'Class 2',
          instructor_id: instructorId,
          start_time: new Date('2024-01-16T10:00:00Z'),
          end_time: new Date('2024-01-16T11:00:00Z'),
          capacity: 15
        },
        {
          name: 'Class 3',
          instructor_id: instructorId,
          start_time: new Date('2024-01-17T10:00:00Z'),
          end_time: new Date('2024-01-17T11:00:00Z'),
          capacity: 10
        }
      ])
      .returning()
      .execute();

    // Create reservations with different statuses
    await db.insert(reservationsTable)
      .values([
        {
          member_id: memberId,
          class_id: classResults[0].id,
          status: 'confirmed'
        },
        {
          member_id: memberId,
          class_id: classResults[1].id,
          status: 'cancelled',
          cancelled_at: new Date()
        },
        {
          member_id: memberId,
          class_id: classResults[2].id,
          status: 'waitlisted'
        }
      ])
      .execute();

    const input: GetReservationsByMemberInput = {
      member_id: memberId
    };

    const result = await getReservationsByMember(input);

    expect(result).toHaveLength(3);

    const statuses = result.map(r => r.status).sort();
    expect(statuses).toEqual(['cancelled', 'confirmed', 'waitlisted']);

    // Verify each reservation belongs to the correct member
    result.forEach(reservation => {
      expect(reservation.member_id).toEqual(memberId);
      expect(reservation.id).toBeDefined();
      expect(reservation.reserved_at).toBeInstanceOf(Date);
    });
  });
});
