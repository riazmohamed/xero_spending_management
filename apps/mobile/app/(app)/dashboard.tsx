import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DashboardStats } from "../../components/DashboardStats";
import { StatementLineCard } from "../../components/StatementLineCard";
import { ReceiptCard } from "../../components/ReceiptCard";
import { useDashboardSummary, useStatementLines, useReceipts } from "../../hooks/useTransactions";
import { useAuthStore } from "../../stores/authStore";

export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } =
    useDashboardSummary();
  const { data: stmtData, isLoading: stmtLoading, refetch: refetchStmt } =
    useStatementLines();
  const { data: receiptsData, refetch: refetchReceipts } = useReceipts();

  const recentLines = stmtData?.statementLines?.slice(0, 5) || [];
  const recentReceipts = receiptsData?.receipts?.slice(0, 3) || [];
  const pendingReceipts = receiptsData?.receipts?.filter(
    (r) => r.status === "extracted" || r.status === "matched",
  ) || [];

  const onRefresh = async () => {
    await Promise.all([refetchSummary(), refetchStmt(), refetchReceipts()]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={summaryLoading && stmtLoading}
            onRefresh={onRefresh}
            tintColor="#13B5EA"
          />
        }
      >
        {/* Header */}
        <View style={{ paddingVertical: 16 }}>
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
            {session?.organisationName || "Your Organisation"}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>
            Dashboard
          </Text>
        </View>

        {/* Stats */}
        <DashboardStats summary={summary} isLoading={summaryLoading} />

        {/* Quick capture */}
        <Pressable
          onPress={() => router.push("/(app)/capture")}
          style={{
            backgroundColor: "#13B5EA",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="camera" size={24} color="white" />
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "600",
                marginLeft: 12,
              }}
            >
              Quick Capture Receipt
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </Pressable>

        {/* Recent receipts */}
        {recentReceipts.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827" }}>
                  Recent Receipts
                </Text>
                {pendingReceipts.length > 0 && (
                  <View
                    style={{
                      backgroundColor: "#FEF3C7",
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: "#D97706", fontSize: 12, fontWeight: "600" }}>
                      {pendingReceipts.length} pending
                    </Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => router.push("/(app)/receipts")}>
                <Text style={{ color: "#13B5EA", fontWeight: "600", fontSize: 14 }}>
                  See All
                </Text>
              </Pressable>
            </View>
            {recentReceipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                onPress={() => router.push(`/(app)/receipts/${receipt.id}`)}
              />
            ))}
          </View>
        )}

        {/* Recent statement lines */}
        <View style={{ marginTop: 24, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827" }}>
              Recent Items to Reconcile
            </Text>
            <Pressable onPress={() => router.push("/(app)/transactions")}>
              <Text style={{ color: "#13B5EA", fontWeight: "600", fontSize: 14 }}>
                See All
              </Text>
            </Pressable>
          </View>

          {stmtLoading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF" }}>Loading statement lines...</Text>
            </View>
          ) : recentLines.length === 0 ? (
            <View
              style={{
                paddingVertical: 32,
                alignItems: "center",
                backgroundColor: "white",
                borderRadius: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={{ color: "#6B7280", marginTop: 8 }}>
                All caught up! No unreconciled items.
              </Text>
            </View>
          ) : (
            recentLines.map((line) => (
              <StatementLineCard
                key={line.statementLineId}
                line={line}
                onPress={() =>
                  router.push(
                    `/(app)/transactions/${line.statementLineId}?type=statement`,
                  )
                }
              />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
