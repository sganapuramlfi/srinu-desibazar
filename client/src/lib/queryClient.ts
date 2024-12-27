import { QueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          const response = await fetch(queryKey[0] as string, {
            credentials: 'include',
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            console.error("Non-JSON response received:", await response.text());
            throw new Error("Invalid response format from server");
          }

          const data = await response.json();

          if (!response.ok) {
            // Handle API error responses
            const errorMessage = data.message || response.statusText;
            if (response.status >= 500) {
              throw new Error(`Server Error (${response.status}): ${errorMessage}`);
            }
            throw new Error(errorMessage);
          }

          return data;
        } catch (error: any) {
          // Handle JSON parsing errors and network errors
          if (error instanceof SyntaxError) {
            console.error("JSON Parse Error:", error);
            throw new Error("Failed to parse server response");
          }
          throw error;
        }
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