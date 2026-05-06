import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, persistToken } from './api';
import type { AuthUser } from './types';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** มีค่าเมื่อเรียก `/auth/me` ไม่สำเร็จ (เช่น backend ไม่ได้รัน → connection refused) */
  authSessionError: unknown;
  logout: () => void;
  setAccessToken: (token: string | null) => Promise<void>;
  refetchSession: () => Promise<unknown>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  const user = sessionQuery.data?.user ?? null;

  const logout = useCallback(() => {
    persistToken(null);
    void queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  const setAccessToken = useCallback(
    async (token: string | null) => {
      persistToken(token);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: sessionQuery.isLoading,
      isAuthenticated: user !== null,
      authSessionError: sessionQuery.isError ? sessionQuery.error : null,
      logout,
      setAccessToken,
      refetchSession: () => sessionQuery.refetch(),
    }),
    [
      user,
      sessionQuery.isLoading,
      sessionQuery.isError,
      sessionQuery.error,
      sessionQuery.refetch,
      logout,
      setAccessToken,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
