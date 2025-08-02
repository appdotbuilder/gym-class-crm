
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

const testCreateInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  role: 'member',
  membership_status: 'active'
};

const testUpdateInput: UpdateUserInput = {
  id: 1,
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '555-5678',
  membership_status: 'inactive'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a user', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const userId = createdUser[0].id;
    const updateInput = { ...testUpdateInput, id: userId };

    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(userId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane@example.com');
    expect(result.phone).toEqual('555-5678');
    expect(result.membership_status).toEqual('inactive');
    expect(result.role).toEqual('member'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated user to database', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const userId = createdUser[0].id;
    const updateInput = { ...testUpdateInput, id: userId };

    await updateUser(updateInput);

    // Query database to verify changes
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    const updatedUser = updatedUsers[0];
    expect(updatedUser.name).toEqual('Jane Smith');
    expect(updatedUser.email).toEqual('jane@example.com');
    expect(updatedUser.phone).toEqual('555-5678');
    expect(updatedUser.membership_status).toEqual('inactive');
  });

  it('should update only specified fields', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const userId = createdUser[0].id;
    const originalUpdatedAt = createdUser[0].updated_at;

    // Update only name
    const partialUpdateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name Only'
    };

    const result = await updateUser(partialUpdateInput);

    // Verify only name was updated, other fields remain unchanged
    expect(result.name).toEqual('Updated Name Only');
    expect(result.email).toEqual('john@example.com'); // Original value
    expect(result.phone).toEqual('555-1234'); // Original value
    expect(result.membership_status).toEqual('active'); // Original value
    expect(result.role).toEqual('member'); // Original value
    expect(result.updated_at).not.toEqual(originalUpdatedAt);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUpdateInput: UpdateUserInput = {
      id: 999,
      name: 'Non-existent User'
    };

    await expect(updateUser(nonExistentUpdateInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle null phone number update', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update phone to null
    const updateInput: UpdateUserInput = {
      id: userId,
      phone: null
    };

    const result = await updateUser(updateInput);

    expect(result.phone).toBeNull();
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
  });

  it('should handle membership status updates', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update membership status to suspended
    const updateInput: UpdateUserInput = {
      id: userId,
      membership_status: 'suspended'
    };

    const result = await updateUser(updateInput);

    expect(result.membership_status).toEqual('suspended');
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.email).toEqual('john@example.com'); // Should remain unchanged
  });
});
