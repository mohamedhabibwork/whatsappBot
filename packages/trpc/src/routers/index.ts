import { router } from "../trpc";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { tenantsRouter } from "./tenants";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  tenants: tenantsRouter,
});

export type AppRouter = typeof appRouter;
