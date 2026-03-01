import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Receipt } from "../types";

interface OCRResultCardProps {
  receipt: Receipt;
}

export function OCRResultCard({ receipt }: OCRResultCardProps) {
  const formattedDate = receipt.transaction_date
    ? new Date(receipt.transaction_date).toLocaleDateString("en-AU")
    : null;

  return (
    <View className="bg-white rounded-xl p-4 mb-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="scan" size={18} color="#13B5EA" />
        <Text className="text-base font-semibold text-gray-900 ml-2">
          Scanned Data
        </Text>
      </View>

      <View className="gap-2">
        <InfoRow label="Merchant" value={receipt.merchant_name} />
        <InfoRow label="Date" value={formattedDate} />
        <InfoRow
          label="Total"
          value={
            receipt.total_amount !== null
              ? `$${Number(receipt.total_amount).toFixed(2)} ${receipt.currency}`
              : null
          }
        />
        <InfoRow
          label="GST"
          value={
            receipt.tax_amount !== null
              ? `$${Number(receipt.tax_amount).toFixed(2)}`
              : null
          }
        />
        <InfoRow label="Payment" value={receipt.payment_method} />
        {receipt.abn && <InfoRow label="ABN" value={receipt.abn} />}
      </View>

      {receipt.line_items.length > 0 && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Line Items
          </Text>
          {receipt.line_items.map((item, idx) => (
            <View key={idx} className="flex-row justify-between py-1">
              <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                {item.quantity > 1 ? `${item.quantity}x ` : ""}
                {item.description}
              </Text>
              <Text className="text-sm text-gray-900 font-medium ml-2">
                ${item.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row items-center">
      <Text className="text-sm text-gray-500 w-20">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium flex-1">
        {value || "—"}
      </Text>
    </View>
  );
}
