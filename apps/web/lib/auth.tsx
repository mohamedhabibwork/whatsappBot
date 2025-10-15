'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from './trpc';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  language: 'en' | 'ar';
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateToken: (token: string) => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  language?: 'en' | 'ar';
  invitationToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'whatsapp_bot_token';
const REFRESH_TOKEN_KEY = 'whatsapp_bot_refresh_token';
const USER_KEY = 'whatsapp_bot_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const meMutation = trpc.auth.me.useQuery(undefined, {
    enabled: !!accessToken,
    retry: false,
  });

  // Load auth state from cookies on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const token = Cookies.get(TOKEN_KEY);
        const refresh = Cookies.get(REFRESH_TOKEN_KEY);
        const userData = Cookies.get(USER_KEY);

        if (token && userData) {
          setAccessToken(token);
          setRefreshToken(refresh || null);
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Verify token with backend if we have one
  useEffect(() => {
    if (accessToken && !meMutation.data && !meMutation.isLoading) {
      meMutation.refetch().catch(() => {
        // Token invalid, clear auth state
        clearAuthState();
      });
    }
  }, [accessToken]);

  const saveAuthState = useCallback((token: string, refresh: string | undefined, userData: User) => {
    // Set cookies with secure options
    Cookies.set(TOKEN_KEY, token, { expires: 7, secure: true, sameSite: 'strict' });
    if (refresh) {
      Cookies.set(REFRESH_TOKEN_KEY, refresh, { expires: 30, secure: true, sameSite: 'strict' });
    }
    Cookies.set(USER_KEY, JSON.stringify(userData), { expires: 7, secure: true, sameSite: 'strict' });
    setAccessToken(token);
    setRefreshToken(refresh || null);
    setUser(userData);
  }, []);

  const clearAuthState = useCallback(() => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    Cookies.remove(USER_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
        rememberMe,
      });

      saveAuthState(result.accessToken, result.refreshToken, {...result.user, language: (result?.user?.language ?? 'ar') as 'en' | 'ar'});
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      clearAuthState();
      throw error;
    }
  }, [loginMutation, saveAuthState, clearAuthState, router]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const result = await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        language: data.language || 'en',
        invitationToken: data.invitationToken,
      });

      // Registration successful, redirect to verification page
      router.push('/auth/verify-email?email=' + encodeURIComponent(data.email));
    } catch (error: any) {
      throw error;
    }
  }, [registerMutation, router]);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await logoutMutation.mutateAsync({ refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
      router.push('/auth/login');
    }
  }, [logoutMutation, refreshToken, clearAuthState, router]);

  const updateToken = useCallback((token: string) => {
    Cookies.set(TOKEN_KEY, token, { expires: 7, secure: true, sameSite: 'strict' });
    setAccessToken(token);
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    login,
    logout,
    register,
    updateToken,
    isAuthenticated: !!user && !!accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protecting routes
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
}
