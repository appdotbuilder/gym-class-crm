
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymClassesTable } from '../db/schema';
import { getGymClasses } from '../handlers/get_gym_classes';

describe('getGymClasses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no classes exist', async () => {
    const result = await getGymClasses();
    expect(result).toEqual([]);
  });

  it('should return all gym classes with instructor information', async () => {
    // Create instructor first
    const instructorResult = await db.insert(usersTable)
      .values({
        name: 'John Instructor',
        email: 'john@gym.com',
        phone: '555-0123',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create gym classes
    const startTime = new Date('2024-12-01T10:00:00Z');
    const endTime = new Date('2024-12-01T11:00:00Z');

    await db.insert(gymClassesTable)
      .values([
        {
          name: 'Morning Yoga',
          instructor_id: instructor.id,
          start_time: startTime,
          end_time: endTime,
          capacity: 20,
          current_bookings: 5,
          is_cancelled: false
        },
        {
          name: 'Evening Pilates',
          instructor_id: instructor.id,
          start_time: new Date('2024-12-01T18:00:00Z'),
          end_time: new Date('2024-12-01T19:00:00Z'),
          capacity: 15,
          current_bookings: 10,
          is_cancelled: false
        }
      ])
      .execute();

    const result = await getGymClasses();

    expect(result).toHaveLength(2);
    
    // Check first class
    const morningYoga = result.find(c => c.name === 'Morning Yoga');
    expect(morningYoga).toBeDefined();
    expect(morningYoga!.instructor_id).toEqual(instructor.id);
    expect(morningYoga!.start_time).toEqual(startTime);
    expect(morningYoga!.end_time).toEqual(endTime);
    expect(morningYoga!.capacity).toEqual(20);
    expect(morningYoga!.current_bookings).toEqual(5);
    expect(morningYoga!.is_cancelled).toEqual(false);
    expect(morningYoga!.id).toBeDefined();
    expect(morningYoga!.created_at).toBeInstanceOf(Date);
    expect(morningYoga!.updated_at).toBeInstanceOf(Date);

    // Check second class
    const eveningPilates = result.find(c => c.name === 'Evening Pilates');
    expect(eveningPilates).toBeDefined();
    expect(eveningPilates!.instructor_id).toEqual(instructor.id);
    expect(eveningPilates!.capacity).toEqual(15);
    expect(eveningPilates!.current_bookings).toEqual(10);
    expect(eveningPilates!.is_cancelled).toEqual(false);
  });

  it('should include cancelled classes in results', async () => {
    // Create instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        name: 'Jane Instructor',
        email: 'jane@gym.com',
        phone: null,
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    const instructor = instructorResult[0];

    // Create cancelled class
    await db.insert(gymClassesTable)
      .values({
        name: 'Cancelled Class',
        instructor_id: instructor.id,
        start_time: new Date('2024-12-01T14:00:00Z'),
        end_time: new Date('2024-12-01T15:00:00Z'),
        capacity: 10,
        current_bookings: 3,
        is_cancelled: true
      })
      .execute();

    const result = await getGymClasses();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Cancelled Class');
    expect(result[0].is_cancelled).toEqual(true);
    expect(result[0].current_bookings).toEqual(3);
  });

  it('should handle multiple instructors correctly', async () => {
    // Create two instructors
    const instructor1Result = await db.insert(usersTable)
      .values({
        name: 'Instructor One',
        email: 'one@gym.com',
        phone: '555-0001',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    const instructor2Result = await db.insert(usersTable)
      .values({
        name: 'Instructor Two',
        email: 'two@gym.com',
        phone: '555-0002',
        role: 'instructor',
        membership_status: null
      })
      .returning()
      .execute();

    const instructor1 = instructor1Result[0];
    const instructor2 = instructor2Result[0];

    // Create classes for both instructors
    await db.insert(gymClassesTable)
      .values([
        {
          name: 'Class by Instructor 1',
          instructor_id: instructor1.id,
          start_time: new Date('2024-12-01T09:00:00Z'),
          end_time: new Date('2024-12-01T10:00:00Z'),
          capacity: 25,
          current_bookings: 12,
          is_cancelled: false
        },
        {
          name: 'Class by Instructor 2',
          instructor_id: instructor2.id,
          start_time: new Date('2024-12-01T11:00:00Z'),
          end_time: new Date('2024-12-01T12:00:00Z'),
          capacity: 30,
          current_bookings: 8,
          is_cancelled: false
        }
      ])
      .execute();

    const result = await getGymClasses();

    expect(result).toHaveLength(2);

    const class1 = result.find(c => c.name === 'Class by Instructor 1');
    const class2 = result.find(c => c.name === 'Class by Instructor 2');

    expect(class1!.instructor_id).toEqual(instructor1.id);
    expect(class2!.instructor_id).toEqual(instructor2.id);
    expect(class1!.capacity).toEqual(25);
    expect(class2!.capacity).toEqual(30);
  });
});
