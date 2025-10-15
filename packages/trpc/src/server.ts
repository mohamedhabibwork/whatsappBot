export { appRouter } from "./routers";
export { createContext } from "./context";
export { setAuthEventSender } from "./routers/auth";
export { setBroadcastFunction } from "./utils/websocket-events";
export { getOpenApiDocument } from "./openapi";
export type { AppRouter } from "./routers";
export {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "./trpc";
