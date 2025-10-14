import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./routers";

export function createClient(url: string, getToken?: () => string | null) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        transformer: superjson,
        headers() {
          const token = getToken?.();
          return token
            ? {
                authorization: `Bearer ${token}`,
              }
            : {};
        },
      }),
    ],
  });
}

export type TRPCClient = ReturnType<typeof createClient>;
