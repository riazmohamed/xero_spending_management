import { Stack } from "expo-router";

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Transaction Detail",
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
          headerTintColor: "#13B5EA",
          headerTitleStyle: {
            fontWeight: "700",
            color: "#111827",
          },
          headerShadowVisible: false,
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
