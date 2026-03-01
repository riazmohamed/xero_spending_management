import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OCRResultCard } from "../../../components/OCRResultCard";
import { MatchCandidateCard } from "../../../components/MatchCandidateCard";
import {
  useReceiptDetail,
  useConfirmMatch,
  useRetryReceipt,
} from "../../../hooks/useTransactions";

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: receipt, isLoading } = useReceiptDetail(id);
  const confirmMutation = useConfirmMatch();
  const retryMutation = useRetryReceipt();

  const handleConfirm = (transactionId: string) => {
    confirmMutation.mutate(
      { receiptId: id, transactionId },
      {
        onSuccess: () => {
          Alert.alert("Success", "Receipt uploaded to Xero!", [
            { text: "OK", onPress: () => router.back() },
          ]);
        },
        onError: (err) => {
          Alert.alert("Error", err.message);
        },
      },
    );
  };

  const handleRetry = () => {
    retryMutation.mutate({ receiptId: id });
  };

  if (isLoading || !receipt) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#13B5EA" />
        <Text className="text-gray-500 mt-4">Loading receipt...</Text>
      </View>
    );
  }

  const isProcessing = receipt.status === "pending" || receipt.status === "processing";
  const hasFailed = receipt.status === "failed";
  const isUploaded = receipt.status === "uploaded";
  const candidates = receipt.match_candidates || [];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Receipt image */}
      {receipt.image_url && (
        <View className="bg-black">
          <Image
            source={{ uri: receipt.image_url }}
            style={{ width: "100%", height: 300 }}
            resizeMode="contain"
          />
        </View>
      )}

      <View className="p-4">
        {/* Processing state */}
        {isProcessing && (
          <View className="bg-blue-50 rounded-xl p-4 mb-4 flex-row items-center">
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className="text-blue-700 font-medium ml-3">
              Processing receipt...
            </Text>
          </View>
        )}

        {/* Failed state */}
        {hasFailed && (
          <View className="bg-red-50 rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text className="text-red-700 font-semibold ml-2">
                Processing Failed
              </Text>
            </View>
            <Text className="text-red-600 text-sm mb-3">
              {receipt.error_message || "Unable to process receipt"}
            </Text>
            <Pressable
              onPress={handleRetry}
              className="bg-red-600 rounded-lg py-2.5 items-center active:bg-red-700"
              disabled={retryMutation.isPending}
            >
              <Text className="text-white font-semibold">
                {retryMutation.isPending ? "Retrying..." : "Retry"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Uploaded success */}
        {isUploaded && (
          <View className="bg-green-50 rounded-xl p-4 mb-4 flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
            <View className="ml-3">
              <Text className="text-green-800 font-semibold">
                Uploaded to Xero
              </Text>
              <Text className="text-green-600 text-sm">
                Receipt attached to transaction
              </Text>
            </View>
          </View>
        )}

        {/* OCR Results */}
        {receipt.merchant_name && <OCRResultCard receipt={receipt} />}

        {/* Match candidates */}
        {candidates.length > 0 && !isUploaded && (
          <View className="mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Matching Transactions
            </Text>
            {confirmMutation.isPending && (
              <View className="bg-blue-50 rounded-xl p-3 mb-3 flex-row items-center">
                <ActivityIndicator size="small" color="#13B5EA" />
                <Text className="text-blue-700 ml-2">
                  Uploading to Xero...
                </Text>
              </View>
            )}
            {candidates.map((candidate) => (
              <MatchCandidateCard
                key={candidate.transactionId}
                candidate={candidate}
                isSelected={
                  candidate.transactionId === receipt.matched_transaction_id
                }
                onConfirm={() => handleConfirm(candidate.transactionId)}
              />
            ))}
          </View>
        )}

        {/* No matches */}
        {candidates.length === 0 &&
          !isProcessing &&
          !hasFailed &&
          !isUploaded &&
          receipt.merchant_name && (
            <View className="bg-yellow-50 rounded-xl p-4 mb-4 items-center">
              <Ionicons name="search" size={32} color="#F59E0B" />
              <Text className="text-yellow-800 font-semibold mt-2">
                No Matching Transactions
              </Text>
              <Text className="text-yellow-600 text-sm text-center mt-1">
                No unreconciled transactions match this receipt. It may appear
                after your bank processes the payment.
              </Text>
            </View>
          )}

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
