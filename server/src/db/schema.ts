
import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'inactive', 'suspended']);
export const userRoleEnum = pgEnum('user_role', ['member', 'instructor', 'admin']);
export const reservationStatusEnum = pgEnum('reservation_status', ['confirmed', 'cancelled', 'waitlisted']);

// Users table (covers members, instructors, and admin)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'), // Nullable by default
  role: userRoleEnum('role').notNull(),
  membership_status: membershipStatusEnum('membership_status'), // Nullable, only for members
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Gym classes table
export const gymClassesTable = pgTable('gym_classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  instructor_id: integer('instructor_id').notNull().references(() => usersTable.id),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  capacity: integer('capacity').notNull(),
  current_bookings: integer('current_bookings').notNull().default(0),
  is_cancelled: boolean('is_cancelled').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Reservations table
export const reservationsTable = pgTable('reservations', {
  id: serial('id').primaryKey(),
  member_id: integer('member_id').notNull().references(() => usersTable.id),
  class_id: integer('class_id').notNull().references(() => gymClassesTable.id),
  status: reservationStatusEnum('status').notNull().default('confirmed'),
  reserved_at: timestamp('reserved_at').defaultNow().notNull(),
  cancelled_at: timestamp('cancelled_at') // Nullable by default
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  instructedClasses: many(gymClassesTable),
  reservations: many(reservationsTable)
}));

export const gymClassesRelations = relations(gymClassesTable, ({ one, many }) => ({
  instructor: one(usersTable, {
    fields: [gymClassesTable.instructor_id],
    references: [usersTable.id]
  }),
  reservations: many(reservationsTable)
}));

export const reservationsRelations = relations(reservationsTable, ({ one }) => ({
  member: one(usersTable, {
    fields: [reservationsTable.member_id],
    references: [usersTable.id]
  }),
  gymClass: one(gymClassesTable, {
    fields: [reservationsTable.class_id],
    references: [gymClassesTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type GymClass = typeof gymClassesTable.$inferSelect;
export type NewGymClass = typeof gymClassesTable.$inferInsert;
export type Reservation = typeof reservationsTable.$inferSelect;
export type NewReservation = typeof reservationsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  gymClasses: gymClassesTable, 
  reservations: reservationsTable 
};
