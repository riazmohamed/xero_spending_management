import { View, Text, Pressable } from "react-native";
import type { StatementLine } from "../types";

interface StatementLineCardProps {
  line: StatementLine;
  onPress: () => void;
}

export function StatementLineCard({ line, onPress }: StatementLineCardProps) {
  const isSpend = line.amount < 0;
  const amount = Math.abs(line.amount);
  const date = new Date(line.postedDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const currencySymbol = line.currencyCode === "GBP" ? "\u00A3" : "$";

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", marginRight: 8 }}>{date}</Text>
            <View
              style={{
                backgroundColor: "#FEF3C7",
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: "#92400E", fontSize: 12, fontWeight: "500" }}>
                Unreconciled
              </Text>
            </View>
          </View>
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}
            numberOfLines={1}
          >
            {line.payee || "Unknown Payee"}
          </Text>
          {line.reference ? (
            <Text
              style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}
              numberOfLines={1}
            >
              {line.reference}
            </Text>
          ) : line.notes ? (
            <Text
              style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}
              numberOfLines={1}
            >
              {line.notes}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            {line.bankAccountName}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: isSpend ? "#DC2626" : "#059669",
            }}
          >
            {isSpend ? "-" : "+"}
            {currencySymbol}
            {amount.toFixed(2)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
