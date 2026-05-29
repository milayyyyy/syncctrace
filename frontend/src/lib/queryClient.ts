import { QueryClient } from '@tanstack/react-query';

/** Shared cache: show stale data instantly, refresh in background. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 45_000,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  },
});
