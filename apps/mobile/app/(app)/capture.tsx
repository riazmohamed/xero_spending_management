import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { CameraOverlay } from "../../components/CameraOverlay";
import { OCRResultCard } from "../../components/OCRResultCard";
import { MatchCandidateCard } from "../../components/MatchCandidateCard";
import {
  useUploadReceipt,
  useConfirmMatch,
} from "../../hooks/useTransactions";
import { compressImage } from "../../services/imageCompressor";
import type { Receipt } from "../../types";

type CaptureStep = "capture" | "uploading" | "results" | "done";

export default function CaptureScreen() {
  const router = useRouter();
  const [step, setStep] = useState<CaptureStep>("capture");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const uploadMutation = useUploadReceipt();
  const confirmMutation = useConfirmMatch();

  const handleCapture = async () => {
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
      try {
        const compressed = await compressImage(result.assets[0].uri);
        setImageUri(compressed.uri);
      } catch {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const handlePickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const compressed = await compressImage(result.assets[0].uri);
        setImageUri(compressed.uri);
      } catch {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const handlePickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.mimeType?.startsWith("image/")) {
        try {
          const compressed = await compressImage(asset.uri);
          setImageUri(compressed.uri);
        } catch {
          setImageUri(asset.uri);
        }
      } else {
        setImageUri(asset.uri);
      }
    }
  };

  const handleConfirm = () => {
    if (!imageUri) return;

    setStep("uploading");
    const fileName = `receipt_${Date.now()}.jpg`;

    uploadMutation.mutate(
      { uri: imageUri, fileName },
      {
        onSuccess: (data) => {
          setReceipt(data);
          setStep("results");
        },
        onError: (err) => {
          Alert.alert("Upload failed", err.message);
          setStep("capture");
        },
      },
    );
  };

  const handleConfirmMatch = (transactionId: string) => {
    if (!receipt) return;

    confirmMutation.mutate(
      { receiptId: receipt.id, transactionId },
      {
        onSuccess: () => {
          setStep("done");
          setTimeout(() => {
            setImageUri(null);
            setReceipt(null);
            setStep("capture");
          }, 2000);
        },
        onError: (err) => {
          Alert.alert("Error", err.message);
        },
      },
    );
  };

  const handleSkip = () => {
    setImageUri(null);
    setReceipt(null);
    setStep("capture");
    // Navigate to receipt detail for later matching
    if (receipt) {
      router.push(`/(app)/receipts/${receipt.id}`);
    }
  };

  const handleRetake = () => {
    setImageUri(null);
  };

  const handleCancel = () => {
    setImageUri(null);
    setReceipt(null);
    setStep("capture");
  };

  // Step: uploading (OCR processing)
  if (step === "uploading") {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#13B5EA" />
        <Text className="text-lg font-semibold text-gray-700 mt-4">
          Processing receipt...
        </Text>
        <Text className="text-gray-400 mt-2 text-center px-8">
          Scanning for merchant, amount, and date
        </Text>
      </SafeAreaView>
    );
  }

  // Step: results (show OCR + matches)
  if (step === "results" && receipt) {
    const candidates = receipt.match_candidates || [];

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">
            Receipt Scanned
          </Text>
          <Pressable onPress={handleCancel}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Mini preview */}
          {receipt.image_url && (
            <View className="bg-black rounded-xl overflow-hidden mb-4">
              <Image
                source={{ uri: receipt.image_url }}
                style={{ width: "100%", height: 160 }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* OCR summary */}
          <OCRResultCard receipt={receipt} />

          {/* Match candidates */}
          {candidates.length > 0 ? (
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Best Matches
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
                  onConfirm={() =>
                    handleConfirmMatch(candidate.transactionId)
                  }
                />
              ))}
            </View>
          ) : (
            <View className="bg-yellow-50 rounded-xl p-4 mb-4 items-center">
              <Ionicons name="search" size={28} color="#F59E0B" />
              <Text className="text-yellow-800 font-semibold mt-2">
                No Matches Found
              </Text>
              <Text className="text-yellow-600 text-sm text-center mt-1">
                This receipt will be saved for later matching
              </Text>
            </View>
          )}

          {/* Skip button */}
          <Pressable
            onPress={handleSkip}
            className="bg-gray-100 rounded-xl py-3.5 items-center mb-4"
          >
            <Text className="text-gray-600 font-semibold">
              Skip — Match Later
            </Text>
          </Pressable>

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step: done
  if (step === "done") {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
          <Ionicons name="checkmark" size={40} color="#10B981" />
        </View>
        <Text className="text-xl font-bold text-gray-900">
          Receipt Uploaded!
        </Text>
        <Text className="text-gray-500 mt-2">
          Successfully attached to transaction in Xero
        </Text>
      </SafeAreaView>
    );
  }

  // Step: capture
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <CameraOverlay
        imageUri={imageUri}
        isUploading={false}
        onCapture={handleCapture}
        onPickFromLibrary={handlePickFromLibrary}
        onPickFromFiles={handlePickFromFiles}
        onConfirm={handleConfirm}
        onRetake={handleRetake}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}
