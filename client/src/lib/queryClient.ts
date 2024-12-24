import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // For public endpoints like services listing, don't include credentials
        const isPublicEndpoint = queryKey[0].toString().includes('/services') || 
                                queryKey[0].toString().includes('/profile');

        const res = await fetch(queryKey[0] as string, {
          credentials: isPublicEndpoint ? 'omit' : 'include',
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          const errorMessage = await res.text();
          throw new Error(`${res.status}: ${errorMessage}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});