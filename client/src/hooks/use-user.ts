import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from "./use-toast";

type LoginData = {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  business?: {
    name: string;
    industryType: string;
    description?: string;
  };
};

type BusinessAccessData = {
  businessId: number;
  businessName: string;
  businessSlug: string;
  industryType: string;
  role: string;
  permissions: any;
  isActive: boolean;
};

type UserResponse = {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date | null;
  businessAccess?: BusinessAccessData[];
  primaryBusiness?: BusinessAccessData;
};

type RequestResult = {
  ok: true;
  user?: UserResponse;
  message?: string;
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
    return { ok: true, user: data.user, message: data.message };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<UserResponse | null> {
  try {
    console.log('[Auth] Fetching user data...');
    const response = await fetch('/api/simple/user', {
      credentials: 'include',
      headers: {
        "Accept": "application/json"
      }
    });

    console.log(`[Auth] Response status: ${response.status}`);

    if (!response.ok) {
      // For any non-OK response, just return null (user not logged in)
      // Only log actual errors, not expected 401s
      if (response.status !== 401) {
        console.log(`[Auth] User fetch failed with status ${response.status} - returning null`);
      }
      return null;
    }

    const userData = await response.json();
    console.log('[Auth] User data retrieved successfully');
    return userData;
  } catch (error) {
    // For network errors or any other issues, return null
    console.log('[Auth] User fetch error:', error);
    return null;
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, error, isLoading } = useQuery<UserResponse | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/simple/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/simple/logout', 'POST'),
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      toast({
        title: "Success",
        description: "Logged out successfully"
      });
    },
  });

  const registerMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/simple/register/customer', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
        toast({
          title: "Success",
          description: "Registration successful"
        });
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