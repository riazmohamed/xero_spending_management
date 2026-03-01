import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Receipt, ReceiptStatus } from "../types";

const STATUS_CONFIG: Record<
  ReceiptStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "bg-yellow-100" },
  processing: { label: "Processing", color: "#3B82F6", bg: "bg-blue-100" },
  extracted: { label: "Scanned", color: "#8B5CF6", bg: "bg-purple-100" },
  matched: { label: "Matched", color: "#10B981", bg: "bg-green-100" },
  confirmed: { label: "Confirmed", color: "#059669", bg: "bg-emerald-100" },
  uploaded: { label: "Uploaded", color: "#059669", bg: "bg-emerald-100" },
  failed: { label: "Failed", color: "#EF4444", bg: "bg-red-100" },
};

interface ReceiptCardProps {
  receipt: Receipt;
  onPress: () => void;
}

export function ReceiptCard({ receipt, onPress }: ReceiptCardProps) {
  const statusInfo = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.pending;
  const hasMatch = receipt.matched_transaction_id !== null;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl p-3 mb-3 flex-row active:bg-gray-50"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      {/* Thumbnail */}
      <View className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden mr-3">
        {receipt.image_url ? (
          <Image
            source={{ uri: receipt.image_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="receipt" size={24} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1 justify-center">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className="text-base font-semibold text-gray-900 flex-1"
            numberOfLines={1}
          >
            {receipt.merchant_name || "Unknown Merchant"}
          </Text>
          <View
            className={`px-2 py-0.5 rounded-full ${statusInfo.bg}`}
          >
            <Text style={{ color: statusInfo.color, fontSize: 11, fontWeight: "600" }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">
            {receipt.transaction_date
              ? new Date(receipt.transaction_date).toLocaleDateString("en-AU")
              : "No date"}
          </Text>
          {receipt.total_amount !== null && (
            <Text className="text-base font-bold text-gray-900">
              ${Number(receipt.total_amount).toFixed(2)}
            </Text>
          )}
        </View>

        {hasMatch && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="link" size={12} color="#10B981" />
            <Text className="text-xs text-green-600 ml-1">
              {receipt.match_confidence !== null
                ? `Match ${Math.round(receipt.match_confidence * 100)}%`
                : "Matched"}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
