'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { AuthProvider } from '@/lib/auth';
import Cookies from 'js-cookie';

const TOKEN_KEY = 'whatsapp_bot_token';
const REFRESH_TOKEN_KEY = 'whatsapp_bot_refresh_token';
const USER_KEY = 'whatsapp_bot_user';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry on 401 errors
          if (error?.data?.httpStatus === 401) {
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        onError: (error: any) => {
          // Handle 401 errors globally
          if (error?.data?.httpStatus === 401) {
            Cookies.remove(TOKEN_KEY);
            Cookies.remove(REFRESH_TOKEN_KEY);
            Cookies.remove(USER_KEY);
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
          }
        },
      },
    },
  }));
  const url = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`
    : 'http://localhost:3001/api/trpc';
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: url,
          async headers() {
            const token = Cookies.get(TOKEN_KEY);
            
            return {
              authorization: token ? `Bearer ${token}` : '',
            };
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}
