
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable } from '../db/schema';
import { type UpdateGymClassInput } from '../schema';
import { updateGymClass } from '../handlers/update_gym_class';
import { eq } from 'drizzle-orm';

describe('updateGymClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let instructorId: number;
  let classId: number;

  beforeEach(async () => {
    // Create an instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        name: 'Test Instructor',
        email: 'instructor@test.com',
        role: 'instructor'
      })
      .returning()
      .execute();
    instructorId = instructorResult[0].id;

    // Create a gym class
    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Original Class',
        instructor_id: instructorId,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        capacity: 20
      })
      .returning()
      .execute();
    classId = classResult[0].id;
  });

  it('should update gym class name', async () => {
    const input: UpdateGymClassInput = {
      id: classId,
      name: 'Updated Class Name'
    };

    const result = await updateGymClass(input);

    expect(result.id).toEqual(classId);
    expect(result.name).toEqual('Updated Class Name');
    expect(result.instructor_id).toEqual(instructorId);
    expect(result.capacity).toEqual(20);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, classId))
      .execute();
    
    expect(dbClass[0].name).toEqual('Updated Class Name');
  });

  it('should update gym class instructor', async () => {
    // Create another instructor
    const newInstructorResult = await db.insert(usersTable)
      .values({
        name: 'New Instructor',
        email: 'newinstructor@test.com',
        role: 'instructor'
      })
      .returning()
      .execute();
    const newInstructorId = newInstructorResult[0].id;

    const input: UpdateGymClassInput = {
      id: classId,
      instructor_id: newInstructorId
    };

    const result = await updateGymClass(input);

    expect(result.instructor_id).toEqual(newInstructorId);
    expect(result.name).toEqual('Original Class');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, classId))
      .execute();
    
    expect(dbClass[0].instructor_id).toEqual(newInstructorId);
  });

  it('should update gym class times', async () => {
    const newStartTime = new Date('2024-01-01T14:00:00Z');
    const newEndTime = new Date('2024-01-01T15:00:00Z');

    const input: UpdateGymClassInput = {
      id: classId,
      start_time: newStartTime,
      end_time: newEndTime
    };

    const result = await updateGymClass(input);

    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update gym class capacity', async () => {
    const input: UpdateGymClassInput = {
      id: classId,
      capacity: 30
    };

    const result = await updateGymClass(input);

    expect(result.capacity).toEqual(30);
    expect(result.name).toEqual('Original Class');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbClass = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.id, classId))
      .execute();
    
    expect(dbClass[0].capacity).toEqual(30);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateGymClassInput = {
      id: classId,
      name: 'Multi-Update Class',
      capacity: 25,
      start_time: new Date('2024-01-01T16:00:00Z'),
      end_time: new Date('2024-01-01T17:00:00Z')
    };

    const result = await updateGymClass(input);

    expect(result.name).toEqual('Multi-Update Class');
    expect(result.capacity).toEqual(25);
    expect(result.start_time).toEqual(new Date('2024-01-01T16:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-01T17:00:00Z'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent gym class', async () => {
    const input: UpdateGymClassInput = {
      id: 999,
      name: 'Non-existent Class'
    };

    await expect(updateGymClass(input)).rejects.toThrow(/gym class with id 999 not found/i);
  });

  it('should throw error for non-existent instructor', async () => {
    const input: UpdateGymClassInput = {
      id: classId,
      instructor_id: 999
    };

    await expect(updateGymClass(input)).rejects.toThrow(/instructor with id 999 not found/i);
  });

  it('should throw error when user is not an instructor', async () => {
    // Create a member user
    const memberResult = await db.insert(usersTable)
      .values({
        name: 'Test Member',
        email: 'member@test.com',
        role: 'member',
        membership_status: 'active'
      })
      .returning()
      .execute();
    const memberId = memberResult[0].id;

    const input: UpdateGymClassInput = {
      id: classId,
      instructor_id: memberId
    };

    await expect(updateGymClass(input)).rejects.toThrow(/user with id .+ is not an instructor/i);
  });

  it('should throw error when start time is after end time', async () => {
    const input: UpdateGymClassInput = {
      id: classId,
      start_time: new Date('2024-01-01T15:00:00Z'),
      end_time: new Date('2024-01-01T14:00:00Z')
    };

    await expect(updateGymClass(input)).rejects.toThrow(/start time must be before end time/i);
  });

  it('should throw error when start time equals end time', async () => {
    const sameTime = new Date('2024-01-01T15:00:00Z');
    const input: UpdateGymClassInput = {
      id: classId,
      start_time: sameTime,
      end_time: sameTime
    };

    await expect(updateGymClass(input)).rejects.toThrow(/start time must be before end time/i);
  });
});
