import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";

export default function LoginScreen() {
  const { login, isLoggingIn, error, clearError } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* Logo area */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-2xl bg-xero-blue items-center justify-center mb-4">
            <Ionicons name="wallet" size={40} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Xero Spending
          </Text>
          <Text className="text-gray-500 text-center text-base">
            Manage receipts and categorize transactions for quick reconciliation
          </Text>
        </View>

        {/* Error message */}
        {error && (
          <Pressable
            onPress={clearError}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 w-full"
          >
            <View className="flex-row items-start">
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <View className="flex-1 ml-2">
                <Text className="text-red-700 text-sm">{error}</Text>
                <Text className="text-red-400 text-xs mt-1">
                  Tap to dismiss
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Login button */}
        <Pressable
          onPress={login}
          disabled={isLoggingIn}
          className={`w-full rounded-xl py-4 items-center ${
            isLoggingIn ? "bg-gray-300" : "bg-xero-blue active:bg-xero-dark"
          }`}
        >
          {isLoggingIn ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white text-lg font-semibold ml-3">
                Connecting...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="log-in" size={22} color="white" />
              <Text className="text-white text-lg font-semibold ml-2">
                Connect with Xero
              </Text>
            </View>
          )}
        </Pressable>

        {/* Info */}
        <View className="mt-8 items-center">
          <Text className="text-xs text-gray-400 text-center">
            You'll be redirected to Xero to securely sign in.{"\n"}
            We never store your Xero password.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
