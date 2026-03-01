import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "../types";

const SESSION_KEY = "xero_session";

// Web fallback: use localStorage since SecureStore is native-only
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loadSession: () => Promise<void>;
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  isAuthenticated: false,

  loadSession: async () => {
    try {
      const stored = await storage.getItem(SESSION_KEY);
      if (stored) {
        const session: AuthSession = JSON.parse(stored);
        set({ session, isAuthenticated: true, isLoading: false });
      } else {
        set({ session: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ session: null, isAuthenticated: false, isLoading: false });
    }
  },

  setSession: async (session: AuthSession) => {
    await storage.setItem(SESSION_KEY, JSON.stringify(session));
    set({ session, isAuthenticated: true, isLoading: false });
  },

  clearSession: async () => {
    await storage.deleteItem(SESSION_KEY);
    set({ session: null, isAuthenticated: false, isLoading: false });
  },
}));
