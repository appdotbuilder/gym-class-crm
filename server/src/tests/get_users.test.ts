
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test users data
const testMembers: CreateUserInput[] = [
  {
    name: 'John Member',
    email: 'john@example.com',
    phone: '555-1234',
    role: 'member',
    membership_status: 'active'
  },
  {
    name: 'Jane Member',
    email: 'jane@example.com',
    phone: null,
    role: 'member',
    membership_status: 'inactive'
  }
];

const testInstructor: CreateUserInput = {
  name: 'Mike Instructor',
  email: 'mike@example.com',
  phone: '555-5678',
  role: 'instructor',
  membership_status: null
};

const testAdmin: CreateUserInput = {
  name: 'Admin User',
  email: 'admin@example.com',
  phone: '555-9999',
  role: 'admin',
  membership_status: null
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users when no role filter is provided', async () => {
    // Create test users
    await db.insert(usersTable).values([
      testMembers[0],
      testMembers[1],
      testInstructor,
      testAdmin
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(4);
    
    // Verify all roles are included
    const roles = result.map(user => user.role);
    expect(roles).toContain('member');
    expect(roles).toContain('instructor');
    expect(roles).toContain('admin');
  });

  it('should filter users by member role', async () => {
    // Create test users
    await db.insert(usersTable).values([
      testMembers[0],
      testMembers[1],
      testInstructor,
      testAdmin
    ]).execute();

    const result = await getUsers('member');

    expect(result).toHaveLength(2);
    result.forEach(user => {
      expect(user.role).toEqual('member');
      expect(['John Member', 'Jane Member']).toContain(user.name);
    });
  });

  it('should filter users by instructor role', async () => {
    // Create test users
    await db.insert(usersTable).values([
      testMembers[0],
      testInstructor,
      testAdmin
    ]).execute();

    const result = await getUsers('instructor');

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('instructor');
    expect(result[0].name).toEqual('Mike Instructor');
    expect(result[0].membership_status).toBeNull();
  });

  it('should filter users by admin role', async () => {
    // Create test users
    await db.insert(usersTable).values([
      testMembers[0],
      testInstructor,
      testAdmin
    ]).execute();

    const result = await getUsers('admin');

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('admin');
    expect(result[0].name).toEqual('Admin User');
    expect(result[0].membership_status).toBeNull();
  });

  it('should return empty array for non-existent role', async () => {
    // Create test users
    await db.insert(usersTable).values([testMembers[0]]).execute();

    const result = await getUsers('nonexistent');

    expect(result).toEqual([]);
  });

  it('should return users with correct field types and values', async () => {
    // Create test user
    await db.insert(usersTable).values(testMembers[0]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    expect(typeof user.id).toBe('number');
    expect(user.name).toEqual('John Member');
    expect(user.email).toEqual('john@example.com');
    expect(user.phone).toEqual('555-1234');
    expect(user.role).toEqual('member');
    expect(user.membership_status).toEqual('active');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});
