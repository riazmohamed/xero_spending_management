import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BankTransaction } from "../types";

interface TransactionCardProps {
  transaction: BankTransaction;
  onPress: () => void;
}

export function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const isSpend = transaction.Type === "SPEND";
  const amount = Math.abs(transaction.Total);
  const date = new Date(transaction.DateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  const isCategorized = transaction.LineItems?.every(
    (li) => li.AccountCode && li.AccountCode !== "",
  );
  const isReady = isCategorized && transaction.HasAttachments;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100 active:bg-gray-50"
      style={{ elevation: 1 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs text-gray-500 mr-2">{date}</Text>
            {isReady && (
              <View className="bg-green-100 rounded-full px-2 py-0.5">
                <Text className="text-green-700 text-xs font-medium">
                  Ready
                </Text>
              </View>
            )}
            {!isReady && isCategorized && (
              <View className="bg-blue-100 rounded-full px-2 py-0.5">
                <Text className="text-blue-700 text-xs font-medium">
                  Categorized
                </Text>
              </View>
            )}
            {!isReady && !isCategorized && (
              <View className="bg-orange-100 rounded-full px-2 py-0.5">
                <Text className="text-orange-700 text-xs font-medium">
                  Needs Review
                </Text>
              </View>
            )}
          </View>
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {transaction.Contact?.Name || "Unknown Contact"}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
            {transaction.LineItems?.[0]?.Description || "No description"}
          </Text>
        </View>

        <View className="items-end">
          <Text
            className={`text-lg font-bold ${isSpend ? "text-red-600" : "text-green-600"}`}
          >
            {isSpend ? "-" : "+"}
            {transaction.CurrencyCode === "GBP" ? "£" : "$"}
            {amount.toFixed(2)}
          </Text>
          <View className="flex-row mt-1 gap-1">
            {transaction.HasAttachments && (
              <Ionicons name="document-attach" size={14} color="#6B7280" />
            )}
            {isCategorized && (
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
