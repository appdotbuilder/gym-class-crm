
import { z } from 'zod';

// Enums for various statuses
export const membershipStatusEnum = z.enum(['active', 'inactive', 'suspended']);
export const userRoleEnum = z.enum(['member', 'instructor', 'admin']);
export const reservationStatusEnum = z.enum(['confirmed', 'cancelled', 'waitlisted']);

// User schema (covers members, instructors, and admin)
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: userRoleEnum,
  membership_status: membershipStatusEnum.nullable(), // Only applicable for members
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Gym class schema
export const gymClassSchema = z.object({
  id: z.number(),
  name: z.string(),
  instructor_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  capacity: z.number().int(),
  current_bookings: z.number().int(),
  is_cancelled: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type GymClass = z.infer<typeof gymClassSchema>;

// Reservation schema
export const reservationSchema = z.object({
  id: z.number(),
  member_id: z.number(),
  class_id: z.number(),
  status: reservationStatusEnum,
  reserved_at: z.coerce.date(),
  cancelled_at: z.coerce.date().nullable()
});

export type Reservation = z.infer<typeof reservationSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: userRoleEnum,
  membership_status: membershipStatusEnum.nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createGymClassInputSchema = z.object({
  name: z.string().min(1),
  instructor_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  capacity: z.number().int().positive()
});

export type CreateGymClassInput = z.infer<typeof createGymClassInputSchema>;

export const createReservationInputSchema = z.object({
  member_id: z.number(),
  class_id: z.number()
});

export type CreateReservationInput = z.infer<typeof createReservationInputSchema>;

// Update schemas
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  membership_status: membershipStatusEnum.nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateGymClassInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  instructor_id: z.number().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  capacity: z.number().int().positive().optional()
});

export type UpdateGymClassInput = z.infer<typeof updateGymClassInputSchema>;

// Query schemas
export const getUserByIdInputSchema = z.object({
  id: z.number()
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;

export const getGymClassByIdInputSchema = z.object({
  id: z.number()
});

export type GetGymClassByIdInput = z.infer<typeof getGymClassByIdInputSchema>;

export const getReservationsByMemberInputSchema = z.object({
  member_id: z.number()
});

export type GetReservationsByMemberInput = z.infer<typeof getReservationsByMemberInputSchema>;

export const getReservationsByClassInputSchema = z.object({
  class_id: z.number()
});

export type GetReservationsByClassInput = z.infer<typeof getReservationsByClassInputSchema>;

export const cancelReservationInputSchema = z.object({
  reservation_id: z.number(),
  user_id: z.number() // For authorization checks
});

export type CancelReservationInput = z.infer<typeof cancelReservationInputSchema>;

export const cancelClassInputSchema = z.object({
  class_id: z.number()
});

export type CancelClassInput = z.infer<typeof cancelClassInputSchema>;
