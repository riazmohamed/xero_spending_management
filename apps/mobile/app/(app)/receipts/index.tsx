import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ReceiptCard } from "../../../components/ReceiptCard";
import { useReceipts } from "../../../hooks/useTransactions";
import type { ReceiptStatus } from "../../../types";

const STATUS_TABS: Array<{ label: string; value: string | undefined }> = [
  { label: "All", value: undefined },
  { label: "Scanned", value: "extracted" },
  { label: "Matched", value: "matched" },
  { label: "Uploaded", value: "uploaded" },
  { label: "Failed", value: "failed" },
];

export default function ReceiptsListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const { data, isLoading, refetch } = useReceipts(activeTab);

  const receipts = data?.receipts || [];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Status filter tabs */}
      <View className="bg-white border-b border-gray-100">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.label}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          renderItem={({ item }) => {
            const isActive = activeTab === item.value;
            return (
              <Pressable
                onPress={() => setActiveTab(item.value)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  isActive ? "bg-xero-blue" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? "text-white" : "text-gray-600"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Receipt list */}
      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#13B5EA"
          />
        }
        renderItem={({ item }) => (
          <ReceiptCard
            receipt={item}
            onPress={() => router.push(`/(app)/receipts/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#13B5EA" />
              <Text className="text-gray-400 mt-4">Loading receipts...</Text>
            </View>
          ) : (
            <View className="py-16 items-center">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-gray-700">
                No receipts yet
              </Text>
              <Text className="text-gray-400 mt-1 text-center px-8">
                Capture a receipt from the Capture tab to get started
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
