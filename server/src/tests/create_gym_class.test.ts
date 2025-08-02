
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gymClassesTable, usersTable } from '../db/schema';
import { type CreateGymClassInput } from '../schema';
import { createGymClass } from '../handlers/create_gym_class';
import { eq } from 'drizzle-orm';

// Test instructor
const testInstructor = {
  name: 'John Instructor',
  email: 'instructor@gym.com',
  phone: '+1234567890',
  role: 'instructor' as const,
  membership_status: null
};

// Test gym class input - note: dates must be in correct order
const testInput: CreateGymClassInput = {
  name: 'Morning Yoga',
  instructor_id: 1, // Will be set after creating instructor
  start_time: new Date('2024-01-15T09:00:00Z'),
  end_time: new Date('2024-01-15T10:00:00Z'),
  capacity: 20
};

describe('createGymClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a gym class', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values(testInstructor)
      .returning()
      .execute();
    
    const instructorId = instructorResult[0].id;
    const input = { ...testInput, instructor_id: instructorId };

    const result = await createGymClass(input);

    // Basic field validation
    expect(result.name).toEqual('Morning Yoga');
    expect(result.instructor_id).toEqual(instructorId);
    expect(result.start_time).toEqual(input.start_time);
    expect(result.end_time).toEqual(input.end_time);
    expect(result.capacity).toEqual(20);
    expect(result.current_bookings).toEqual(0);
    expect(result.is_cancelled).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save gym class to database', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values(testInstructor)
      .returning()
      .execute();
    
    const instructorId = instructorResult[0].id;
    const input = { ...testInput, instructor_id: instructorId };

    const result = await createGymClass(input);

    // Query database to verify persistence
    const gymClasses = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, result.id))
      .execute();

    expect(gymClasses).toHaveLength(1);
    expect(gymClasses[0].name).toEqual('Morning Yoga');
    expect(gymClasses[0].instructor_id).toEqual(instructorId);
    expect(gymClasses[0].capacity).toEqual(20);
    expect(gymClasses[0].current_bookings).toEqual(0);
    expect(gymClasses[0].is_cancelled).toEqual(false);
    expect(gymClasses[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when instructor does not exist', async () => {
    const input = { ...testInput, instructor_id: 999 };

    await expect(createGymClass(input)).rejects.toThrow(/instructor not found/i);
  });

  it('should throw error when user is not an instructor', async () => {
    // Create a member (not instructor)
    const memberResult = await db.insert(usersTable)
      .values({
        name: 'John Member',
        email: 'member@gym.com',
        phone: '+1234567890',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();
    
    const memberId = memberResult[0].id;
    const input = { ...testInput, instructor_id: memberId };

    await expect(createGymClass(input)).rejects.toThrow(/instructor not found/i);
  });

  it('should throw error when start time is after end time', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values(testInstructor)
      .returning()
      .execute();
    
    const instructorId = instructorResult[0].id;
    const input = {
      ...testInput,
      instructor_id: instructorId,
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T09:00:00Z') // End before start
    };

    await expect(createGymClass(input)).rejects.toThrow(/start time must be before end time/i);
  });

  it('should throw error when start time equals end time', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values(testInstructor)
      .returning()
      .execute();
    
    const instructorId = instructorResult[0].id;
    const sameTime = new Date('2024-01-15T09:00:00Z');
    const input = {
      ...testInput,
      instructor_id: instructorId,
      start_time: sameTime,
      end_time: sameTime
    };

    await expect(createGymClass(input)).rejects.toThrow(/start time must be before end time/i);
  });
});
