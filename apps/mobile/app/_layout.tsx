import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../hooks/useApi";
import { useAuthStore } from "../stores/authStore";
import { checkWebRedirect } from "../services/auth";
import "../global.css";

export default function RootLayout() {
  const { isLoading, isAuthenticated, loadSession, setSession } =
    useAuthStore();

  useEffect(() => {
    async function init() {
      // On web, check if we're returning from Xero OAuth redirect
      const session = await checkWebRedirect();
      if (session) {
        await setSession(session);
      } else {
        await loadSession();
      }
    }
    init();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(app)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </QueryClientProvider>
  );
}
