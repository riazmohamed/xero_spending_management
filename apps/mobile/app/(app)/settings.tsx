import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../stores/authStore";
import { queryClient } from "../../hooks/useApi";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { session } = useAuthStore();

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect from Xero",
      "This will sign you out and remove all cached data. You can reconnect at any time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            queryClient.clear();
            await logout();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Connection info */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Connection
          </Text>

          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <View className="ml-3">
              <Text className="text-base font-semibold text-gray-900">
                Connected to Xero
              </Text>
              <Text className="text-sm text-gray-500">
                {session?.organisationName || "Unknown Organisation"}
              </Text>
            </View>
          </View>

          <View className="bg-gray-50 rounded-lg p-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-500">Tenant ID</Text>
              <Text className="text-sm text-gray-400 font-mono" numberOfLines={1}>
                {session?.tenantId?.slice(0, 12)}...
              </Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-500 uppercase mb-3">
            About
          </Text>

          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-500">App Version</Text>
              <Text className="text-gray-900">1.0.0</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-500">Purpose</Text>
              <Text className="text-gray-900 text-right flex-1 ml-4">
                Reconciliation preparation
              </Text>
            </View>
          </View>
        </View>

        {/* Important note */}
        <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text className="text-blue-700 text-sm ml-2 flex-1">
              This app prepares transactions for reconciliation. Final
              reconciliation must be done in Xero's web interface — the API
              does not support programmatic reconciliation.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="mb-8">
          <Pressable
            onPress={handleDisconnect}
            className="bg-red-50 border border-red-200 rounded-xl py-4 items-center active:bg-red-100"
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out" size={20} color="#DC2626" />
              <Text className="text-red-600 font-semibold text-base ml-2">
                Disconnect from Xero
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
