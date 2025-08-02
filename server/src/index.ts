
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  getUserByIdInputSchema,
  updateUserInputSchema,
  createGymClassInputSchema,
  getGymClassByIdInputSchema,
  updateGymClassInputSchema,
  cancelClassInputSchema,
  createReservationInputSchema,
  getReservationsByMemberInputSchema,
  getReservationsByClassInputSchema,
  cancelReservationInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { createGymClass } from './handlers/create_gym_class';
import { getGymClasses } from './handlers/get_gym_classes';
import { getGymClassById } from './handlers/get_gym_class_by_id';
import { updateGymClass } from './handlers/update_gym_class';
import { cancelClass } from './handlers/cancel_class';
import { createReservation } from './handlers/create_reservation';
import { getReservationsByMember } from './handlers/get_reservations_by_member';
import { getReservationsByClass } from './handlers/get_reservations_by_class';
import { getAllReservations } from './handlers/get_all_reservations';
import { cancelReservation } from './handlers/cancel_reservation';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserById(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Gym class management routes
  createGymClass: publicProcedure
    .input(createGymClassInputSchema)
    .mutation(({ input }) => createGymClass(input)),
  
  getGymClasses: publicProcedure
    .query(() => getGymClasses()),
  
  getGymClassById: publicProcedure
    .input(getGymClassByIdInputSchema)
    .query(({ input }) => getGymClassById(input)),
  
  updateGymClass: publicProcedure
    .input(updateGymClassInputSchema)
    .mutation(({ input }) => updateGymClass(input)),
  
  cancelClass: publicProcedure
    .input(cancelClassInputSchema)
    .mutation(({ input }) => cancelClass(input)),

  // Reservation management routes
  createReservation: publicProcedure
    .input(createReservationInputSchema)
    .mutation(({ input }) => createReservation(input)),
  
  getReservationsByMember: publicProcedure
    .input(getReservationsByMemberInputSchema)
    .query(({ input }) => getReservationsByMember(input)),
  
  getReservationsByClass: publicProcedure
    .input(getReservationsByClassInputSchema)
    .query(({ input }) => getReservationsByClass(input)),
  
  getAllReservations: publicProcedure
    .query(() => getAllReservations()),
  
  cancelReservation: publicProcedure
    .input(cancelReservationInputSchema)
    .mutation(({ input }) => cancelReservation(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
