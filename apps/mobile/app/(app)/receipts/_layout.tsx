import { Stack } from "expo-router";

export default function ReceiptsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "700",
          color: "#111827",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Receipts" }} />
      <Stack.Screen
        name="[id]"
        options={{ title: "Receipt Detail" }}
      />
    </Stack>
  );
}
