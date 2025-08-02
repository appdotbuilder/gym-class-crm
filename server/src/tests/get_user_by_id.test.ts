
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput, type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test input for user creation
const testUserInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  role: 'member',
  membership_status: 'active'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    const createResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const createdUser = createResult[0];
    const input: GetUserByIdInput = { id: createdUser.id };

    const result = await getUserById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.role).toEqual('member');
    expect(result!.membership_status).toEqual('active');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const input: GetUserByIdInput = { id: 999 };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should return user with null phone when phone is null', async () => {
    // Create user without phone
    const userWithoutPhone: CreateUserInput = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: null,
      role: 'instructor',
      membership_status: null
    };

    const createResult = await db.insert(usersTable)
      .values(userWithoutPhone)
      .returning()
      .execute();

    const createdUser = createResult[0];
    const input: GetUserByIdInput = { id: createdUser.id };

    const result = await getUserById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.email).toEqual('jane.smith@example.com');
    expect(result!.phone).toBeNull();
    expect(result!.role).toEqual('instructor');
    expect(result!.membership_status).toBeNull();
  });
});
