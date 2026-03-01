import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatementLineCard } from "../../../components/StatementLineCard";
import { useStatementLines } from "../../../hooks/useTransactions";
import type { StatementLine } from "../../../types";

export default function TransactionsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useStatementLines();

  const lines = data?.statementLines || [];

  const filtered = search
    ? lines.filter(
        (line) =>
          line.payee?.toLowerCase().includes(search.toLowerCase()) ||
          line.reference?.toLowerCase().includes(search.toLowerCase()) ||
          line.notes?.toLowerCase().includes(search.toLowerCase()),
      )
    : lines;

  const renderItem = ({ item }: { item: StatementLine }) => (
    <StatementLineCard
      line={item}
      onPress={() =>
        router.push(
          `/(app)/transactions/${item.statementLineId}?type=statement`,
        )
      }
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "white",
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 4 }}>
          Items to Reconcile
        </Text>
        <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 12 }}>
          {data?.totalCount ?? "..."} unreconciled items
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by payee or reference..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, marginLeft: 8, fontSize: 16, color: "#111827" }}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color="#9CA3AF"
              onPress={() => setSearch("")}
            />
          )}
        </View>
      </View>

      {/* Statement line list */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.statementLineId}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#13B5EA"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#13B5EA" />
            </View>
          ) : (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={{ color: "#9CA3AF", marginTop: 12 }}>
                {search ? "No matching items" : "No unreconciled items found"}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
