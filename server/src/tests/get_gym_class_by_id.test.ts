
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable } from '../db/schema';
import { type GetGymClassByIdInput, type CreateUserInput, type CreateGymClassInput } from '../schema';
import { getGymClassById } from '../handlers/get_gym_class_by_id';

describe('getGymClassById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return gym class by ID', async () => {
    // Create instructor first
    const instructorInput: CreateUserInput = {
      name: 'John Instructor',
      email: 'instructor@gym.com',
      phone: '555-0123',
      role: 'instructor',
      membership_status: null
    };

    const instructorResult = await db.insert(usersTable)
      .values(instructorInput)
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create gym class
    const classInput: CreateGymClassInput = {
      name: 'Morning Yoga',
      instructor_id: instructor.id,
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      capacity: 20
    };

    const classResult = await db.insert(gymClassesTable)
      .values({
        ...classInput,
        current_bookings: 0,
        is_cancelled: false
      })
      .returning()
      .execute();

    const gymClass = classResult[0];

    // Test the handler
    const input: GetGymClassByIdInput = { id: gymClass.id };
    const result = await getGymClassById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(gymClass.id);
    expect(result!.name).toEqual('Morning Yoga');
    expect(result!.instructor_id).toEqual(instructor.id);
    expect(result!.start_time).toEqual(new Date('2024-01-15T09:00:00Z'));
    expect(result!.end_time).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result!.capacity).toEqual(20);
    expect(result!.current_bookings).toEqual(0);
    expect(result!.is_cancelled).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent gym class', async () => {
    const input: GetGymClassByIdInput = { id: 999 };
    const result = await getGymClassById(input);

    expect(result).toBeNull();
  });

  it('should return gym class with correct instructor association', async () => {
    // Create instructor
    const instructorInput: CreateUserInput = {
      name: 'Jane Instructor',
      email: 'jane@gym.com',
      phone: '555-0124',
      role: 'instructor',
      membership_status: null
    };

    const instructorResult = await db.insert(usersTable)
      .values(instructorInput)
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create gym class
    const classInput: CreateGymClassInput = {
      name: 'Evening Pilates',
      instructor_id: instructor.id,
      start_time: new Date('2024-01-15T18:00:00Z'),
      end_time: new Date('2024-01-15T19:00:00Z'),
      capacity: 15
    };

    const classResult = await db.insert(gymClassesTable)
      .values({
        ...classInput,
        current_bookings: 5,
        is_cancelled: false
      })
      .returning()
      .execute();

    const gymClass = classResult[0];

    // Test the handler
    const input: GetGymClassByIdInput = { id: gymClass.id };
    const result = await getGymClassById(input);

    expect(result).not.toBeNull();
    expect(result!.instructor_id).toEqual(instructor.id);
    expect(result!.current_bookings).toEqual(5);
  });
});
