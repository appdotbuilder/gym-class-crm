
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user types
const memberInput: CreateUserInput = {
  name: 'John Member',
  email: 'john.member@test.com',
  phone: '123-456-7890',
  role: 'member',
  membership_status: 'active'
};

const instructorInput: CreateUserInput = {
  name: 'Jane Instructor',
  email: 'jane.instructor@test.com',
  phone: '987-654-3210',
  role: 'instructor',
  membership_status: null
};

const adminInput: CreateUserInput = {
  name: 'Admin User',
  email: 'admin@test.com',
  phone: null,
  role: 'admin',
  membership_status: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a member with membership status', async () => {
    const result = await createUser(memberInput);

    expect(result.name).toEqual('John Member');
    expect(result.email).toEqual('john.member@test.com');
    expect(result.phone).toEqual('123-456-7890');
    expect(result.role).toEqual('member');
    expect(result.membership_status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an instructor without membership status', async () => {
    const result = await createUser(instructorInput);

    expect(result.name).toEqual('Jane Instructor');
    expect(result.email).toEqual('jane.instructor@test.com');
    expect(result.phone).toEqual('987-654-3210');
    expect(result.role).toEqual('instructor');
    expect(result.membership_status).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an admin with null phone', async () => {
    const result = await createUser(adminInput);

    expect(result.name).toEqual('Admin User');
    expect(result.email).toEqual('admin@test.com');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('admin');
    expect(result.membership_status).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(memberInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Member');
    expect(users[0].email).toEqual('john.member@test.com');
    expect(users[0].role).toEqual('member');
    expect(users[0].membership_status).toEqual('active');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    await createUser(memberInput);

    const duplicateInput: CreateUserInput = {
      name: 'Another User',
      email: 'john.member@test.com', // Same email
      phone: '555-0000',
      role: 'instructor',
      membership_status: null
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should reject membership status for non-members', async () => {
    const invalidInstructorInput: CreateUserInput = {
      name: 'Bad Instructor',
      email: 'bad.instructor@test.com',
      phone: '555-1234',
      role: 'instructor',
      membership_status: 'active' // This should not be allowed
    };

    await expect(createUser(invalidInstructorInput)).rejects.toThrow(/membership status can only be set for members/i);

    const invalidAdminInput: CreateUserInput = {
      name: 'Bad Admin',
      email: 'bad.admin@test.com',
      phone: null,
      role: 'admin',
      membership_status: 'suspended' // This should not be allowed
    };

    await expect(createUser(invalidAdminInput)).rejects.toThrow(/membership status can only be set for members/i);
  });

  it('should allow member with null membership status', async () => {
    const memberWithNullStatus: CreateUserInput = {
      name: 'Pending Member',
      email: 'pending@test.com',
      phone: '555-9999',
      role: 'member',
      membership_status: null
    };

    const result = await createUser(memberWithNullStatus);

    expect(result.role).toEqual('member');
    expect(result.membership_status).toBeNull();
  });
});
