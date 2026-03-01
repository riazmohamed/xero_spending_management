import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DashboardSummary } from "../types";

interface DashboardStatsProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, icon, color, bgColor }: StatCardProps) {
  return (
    <View style={{ flex: 1, borderRadius: 12, padding: 16, backgroundColor: bgColor }}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ fontSize: 24, fontWeight: "bold", marginTop: 8, color }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: "#4B5563", marginTop: 4 }}>{title}</Text>
    </View>
  );
}

export function DashboardStats({ summary, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#13B5EA" />
      </View>
    );
  }

  if (!summary) return null;

  const currencySymbol = summary.currency === "GBP" ? "\u00A3" : "$";

  return (
    <View>
      {/* Unreconciled count - prominent */}
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#F3F4F6",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
              Items to Reconcile
            </Text>
            <Text style={{ fontSize: 36, fontWeight: "bold", color: "#DC2626", marginTop: 4 }}>
              {summary.totalCount}
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              statement lines from bank feed
            </Text>
          </View>
          <Ionicons name="alert-circle" size={48} color="#FECACA" />
        </View>
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <StatCard
          title="Transactions"
          value={summary.bankTransactionCount}
          icon="receipt"
          color="#7C3AED"
          bgColor="#F5F3FF"
        />
        <StatCard
          title="With Receipts"
          value={summary.withAttachments}
          icon="document-attach"
          color="#2563EB"
          bgColor="#EFF6FF"
        />
        <StatCard
          title="Ready"
          value={summary.ready}
          icon="checkmark-circle"
          color="#16A34A"
          bgColor="#F0FDF4"
        />
      </View>

      {/* Totals */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 12, color: "#6B7280" }}>Total Spending</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#DC2626" }}>
            {currencySymbol}
            {summary.totalSpend.toFixed(2)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 12, color: "#6B7280" }}>Total Received</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#059669" }}>
            {currencySymbol}
            {summary.totalReceive.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}
