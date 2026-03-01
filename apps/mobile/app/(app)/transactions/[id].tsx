import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ReceiptPreview } from "../../../components/ReceiptPreview";
import {
  useTransaction,
  useAttachments,
  useAccounts,
  useUpdateTransaction,
  useUploadAttachment,
  useStatementLines,
} from "../../../hooks/useTransactions";
import type { Account, StatementLine } from "../../../types";

export default function TransactionDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const router = useRouter();
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const isStatementLine = type === "statement";

  // For statement lines, find the line from cached data
  const { data: stmtData } = useStatementLines();
  const statementLine = isStatementLine
    ? stmtData?.statementLines?.find((l) => l.statementLineId === id)
    : null;

  // For bank transactions, fetch from API
  const { data: transaction, isLoading: txLoading } = useTransaction(
    isStatementLine ? "" : id,
  );
  const { data: attachments, isLoading: attachLoading } = useAttachments(
    isStatementLine ? "" : id,
  );
  const { data: accountsData } = useAccounts();
  const updateMutation = useUpdateTransaction();
  const uploadMutation = useUploadAttachment();

  const accounts = accountsData?.Accounts || [];

  // Statement line detail view
  if (isStatementLine) {
    if (!statementLine) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
          <ActivityIndicator size="large" color="#13B5EA" />
        </View>
      );
    }

    const isSpend = statementLine.amount < 0;
    const amount = Math.abs(statementLine.amount);
    const currencySymbol = statementLine.currencyCode === "GBP" ? "\u00A3" : "$";
    const date = new Date(statementLine.postedDate).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        {/* Amount header */}
        <View
          style={{
            backgroundColor: "white",
            paddingHorizontal: 16,
            paddingVertical: 24,
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
          }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: "bold",
              color: isSpend ? "#DC2626" : "#059669",
            }}
          >
            {isSpend ? "-" : "+"}
            {currencySymbol}
            {amount.toFixed(2)}
          </Text>
          <Text style={{ color: "#6B7280", marginTop: 4, fontSize: 16 }}>
            {statementLine.payee || "Unknown Payee"}
          </Text>
          <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 2 }}>{date}</Text>
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginTop: 8,
            }}
          >
            <Text style={{ color: "#92400E", fontSize: 14, fontWeight: "500" }}>
              Unreconciled Statement Line
            </Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* Details section */}
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
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#6B7280",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Details
            </Text>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#6B7280" }}>Type</Text>
                <View
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: isSpend ? "#FEE2E2" : "#D1FAE5",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: isSpend ? "#991B1B" : "#065F46",
                    }}
                  >
                    {isSpend ? "Spend" : "Receive"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#6B7280" }}>Bank Account</Text>
                <Text style={{ color: "#111827", fontWeight: "500" }}>
                  {statementLine.bankAccountName}
                </Text>
              </View>

              {statementLine.reference ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#6B7280" }}>Reference</Text>
                  <Text style={{ color: "#111827", flex: 1, textAlign: "right", marginLeft: 16 }} numberOfLines={2}>
                    {statementLine.reference}
                  </Text>
                </View>
              ) : null}

              {statementLine.notes ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#6B7280" }}>Notes</Text>
                  <Text style={{ color: "#111827", flex: 1, textAlign: "right", marginLeft: 16 }} numberOfLines={2}>
                    {statementLine.notes}
                  </Text>
                </View>
              ) : null}

              {statementLine.chequeNo ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#6B7280" }}>Cheque No</Text>
                  <Text style={{ color: "#111827" }}>{statementLine.chequeNo}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#6B7280" }}>Transaction Date</Text>
                <Text style={{ color: "#111827" }}>
                  {new Date(statementLine.transactionDate || statementLine.postedDate).toLocaleDateString("en-GB")}
                </Text>
              </View>
            </View>
          </View>

          {/* Info about reconciliation */}
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <Text style={{ color: "#1E40AF", fontWeight: "600", marginLeft: 8 }}>
                Reconciliation Required
              </Text>
            </View>
            <Text style={{ color: "#1E40AF", fontSize: 14, lineHeight: 20 }}>
              This is a bank statement line from your bank feed. To reconcile it, go to
              Xero's web interface and match or create the transaction there. Use this
              app to review items and prepare receipts.
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  // Bank transaction detail view (original behavior)
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `receipt_${Date.now()}.jpg`;
      uploadMutation.mutate({ transactionId: id, uri: asset.uri, fileName });
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `receipt_${Date.now()}.jpg`;
      uploadMutation.mutate({ transactionId: id, uri: asset.uri, fileName });
    }
  };

  const handleSetCategory = (account: Account) => {
    if (!transaction) return;

    const lineItems = transaction.LineItems.map((li) => ({
      ...li,
      AccountCode: account.Code,
    }));

    updateMutation.mutate(
      { transactionId: id, lineItems },
      {
        onSuccess: () => setShowAccountPicker(false),
        onError: (err) => Alert.alert("Error", err.message),
      },
    );
  };

  if (txLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
        <ActivityIndicator size="large" color="#13B5EA" />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
        <Text style={{ color: "#9CA3AF" }}>Transaction not found</Text>
      </View>
    );
  }

  // Account picker modal
  if (showAccountPicker) {
    const isSpend = transaction.Type === "SPEND";
    const expenseAccounts = accounts.filter(
      (a) =>
        a.Class === "EXPENSE" ||
        a.Type === "EXPENSE" ||
        a.Type === "DIRECTCOSTS" ||
        a.Type === "OVERHEADS" ||
        (isSpend && a.Class !== "REVENUE"),
    );

    return (
      <View style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827" }}>
            Select Account
          </Text>
          <Pressable onPress={() => setShowAccountPicker(false)}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>
        <FlatList
          data={expenseAccounts}
          keyExtractor={(item) => item.AccountID}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSetCategory(item)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#F9FAFB",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "#9CA3AF", width: 64 }}>
                  {item.Code}
                </Text>
                <Text style={{ fontSize: 16, color: "#111827", flex: 1 }}>
                  {item.Name}
                </Text>
              </View>
              {item.Description && (
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 64, marginTop: 2 }}>
                  {item.Description}
                </Text>
              )}
            </Pressable>
          )}
        />
      </View>
    );
  }

  const isSpend = transaction.Type === "SPEND";
  const amount = Math.abs(transaction.Total);
  const currencySymbol = transaction.CurrencyCode === "GBP" ? "\u00A3" : "$";

  const date = new Date(transaction.DateString).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const currentAccountCode = transaction.LineItems?.[0]?.AccountCode;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Amount header */}
      <View
        style={{
          backgroundColor: "white",
          paddingHorizontal: 16,
          paddingVertical: 24,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <Text
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: isSpend ? "#DC2626" : "#059669",
          }}
        >
          {isSpend ? "-" : "+"}
          {currencySymbol}
          {amount.toFixed(2)}
        </Text>
        <Text style={{ color: "#6B7280", marginTop: 4, fontSize: 16 }}>
          {transaction.Contact?.Name}
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 2 }}>{date}</Text>
      </View>

      <View style={{ padding: 16 }}>
        {/* Details section */}
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
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#6B7280",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Details
          </Text>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#6B7280" }}>Type</Text>
              <View
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: isSpend ? "#FEE2E2" : "#D1FAE5",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: isSpend ? "#991B1B" : "#065F46",
                  }}
                >
                  {isSpend ? "Spend" : "Receive"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#6B7280" }}>Bank Account</Text>
              <Text style={{ color: "#111827", fontWeight: "500" }}>
                {transaction.BankAccount?.Name}
              </Text>
            </View>

            {transaction.Reference && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#6B7280" }}>Reference</Text>
                <Text style={{ color: "#111827" }}>{transaction.Reference}</Text>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#6B7280" }}>Status</Text>
              <Text style={{ color: "#111827" }}>{transaction.Status}</Text>
            </View>
          </View>
        </View>

        {/* Line items */}
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
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#6B7280",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Line Items
          </Text>

          {transaction.LineItems?.map((li, i) => (
            <View
              key={li.LineItemID || i}
              style={{
                paddingVertical: 8,
                borderBottomWidth: i < transaction.LineItems.length - 1 ? 1 : 0,
                borderBottomColor: "#F9FAFB",
              }}
            >
              <Text style={{ color: "#111827" }}>
                {li.Description || "No description"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                  {li.Quantity} x {currencySymbol}
                  {li.UnitAmount.toFixed(2)}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
                  {currencySymbol}
                  {li.LineAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Category */}
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
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#6B7280",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Category
          </Text>

          <Pressable
            onPress={() => setShowAccountPicker(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={currentAccountCode ? "checkmark-circle" : "add-circle-outline"}
                size={20}
                color={currentAccountCode ? "#10B981" : "#13B5EA"}
              />
              <Text style={{ fontSize: 16, color: "#111827", marginLeft: 8 }}>
                {currentAccountCode || "Select account code"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          {updateMutation.isPending && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <ActivityIndicator size="small" color="#13B5EA" />
              <Text style={{ fontSize: 14, color: "#9CA3AF", marginLeft: 8 }}>
                Updating...
              </Text>
            </View>
          )}
        </View>

        {/* Attachments */}
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
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#6B7280",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Receipts & Attachments
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {attachments?.map((att) => (
              <ReceiptPreview key={att.AttachmentID} attachment={att} />
            ))}
            {uploadMutation.isPending && <ReceiptPreview isUploading />}
          </ScrollView>

          {attachLoading && <ActivityIndicator size="small" color="#13B5EA" />}

          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={handleTakePhoto}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#13B5EA",
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="camera" size={18} color="white" />
              <Text style={{ color: "white", fontWeight: "600", marginLeft: 8 }}>
                Photo
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePickImage}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="images" size={18} color="#374151" />
              <Text style={{ color: "#374151", fontWeight: "600", marginLeft: 8 }}>
                Library
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
