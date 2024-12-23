import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Business, InsertBusiness } from "@db/schema";

type RequestResult = {
  ok: true;
  business?: Business;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: InsertBusiness
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      return { ok: false, message };
    }

    const data = await response.json();
    return { ok: true, business: data };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

export function useBusiness(businessId?: number) {
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["businesses", businessId],
    queryFn: async () => {
      const response = await fetch(`/api/businesses/${businessId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch business");
      }
      return response.json();
    },
    enabled: !!businessId,
  });

  const createMutation = useMutation<RequestResult, Error, InsertBusiness>({
    mutationFn: (data) => handleRequest("/api/businesses", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });

  const updateMutation = useMutation<RequestResult, Error, Partial<Business>>({
    mutationFn: (data) =>
      handleRequest(`/api/businesses/${businessId}`, "PUT", data as InsertBusiness),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses", businessId] });
    },
  });

  return {
    business,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
  };
}
