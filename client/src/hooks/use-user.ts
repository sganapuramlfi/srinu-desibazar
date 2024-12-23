import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";

type LoginData = {
  username: string;
  password: string;
  email?: string;
  role?: string;
  business?: {
    name: string;
    industryType: string;
    description?: string;
  };
};

type UserResponse = {
  id: number;
  username: string;
  role: string;
  business?: {
    id: number;
    name: string;
    industryType: string;
    status: string;
    onboardingCompleted: boolean;
  };
  needsOnboarding?: boolean;
};

type RequestResult = {
  ok: true;
  user?: UserResponse;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: LoginData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        return { ok: false, message: errorJson.message || errorText };
      } catch {
        return { ok: false, message: errorText };
      }
    }

    const data = await response.json();
    return { ok: true, user: data.user };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<UserResponse | null> {
  const response = await fetch('/api/user', {
    credentials: 'include',
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }

    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || errorText);
    } catch {
      throw new Error(errorText);
    }
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<UserResponse | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
    },
  });

  const registerMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}