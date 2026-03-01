import { useState, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { loginWithXero, logout as logoutService } from "../services/auth";

export function useAuth() {
  const { session, isLoading, isAuthenticated, setSession, clearSession } =
    useAuthStore();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const authSession = await loginWithXero();
      await setSession(authSession);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, [setSession]);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  return {
    session,
    isLoading,
    isAuthenticated,
    isLoggingIn,
    error,
    login,
    logout,
    clearError: () => setError(null),
  };
}
