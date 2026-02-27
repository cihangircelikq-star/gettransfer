import { create } from 'zustand';
import { API } from '@/utils/api'
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string, userType: 'customer' | 'driver' | 'admin') => Promise<void>;
  register: (userData: any, userType: 'customer' | 'driver') => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string, userType: 'customer' | 'driver' | 'admin') => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          body: JSON.stringify({ email, password, userType }),
          });

          const data: AuthResponse = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Login failed');
          }

          if (data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              refreshToken: data.data.refreshToken,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      register: async (userData: any, userType: 'customer' | 'driver') => {
        set({ isLoading: true, error: null });
        
        try {
          const endpoint = userType === 'driver' ? `${API}/auth/register/driver` : `${API}/auth/register/customer`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          const data: AuthResponse = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Registration failed');
          }

          if (data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              refreshToken: data.data.refreshToken,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          error: null,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setTokens: (token: string, refreshToken: string) => {
        set({ token, refreshToken });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
