import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@repo/trpc';

// @ts-expect-error - Type inference issue with cross-workspace types
export const trpc = createTRPCReact<AppRouter>();
