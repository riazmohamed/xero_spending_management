import { View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Attachment } from "../types";

interface ReceiptPreviewProps {
  attachment?: Attachment;
  localUri?: string;
  isUploading?: boolean;
  onRemove?: () => void;
}

export function ReceiptPreview({
  attachment,
  localUri,
  isUploading,
  onRemove,
}: ReceiptPreviewProps) {
  const isImage =
    attachment?.MimeType?.startsWith("image/") ||
    localUri?.match(/\.(jpg|jpeg|png|gif)$/i);

  return (
    <View className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 mr-3 border border-gray-200">
      {isUploading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#13B5EA" />
          <Text className="text-xs text-gray-500 mt-1">Uploading</Text>
        </View>
      ) : isImage ? (
        <Image
          source={{ uri: localUri || attachment?.Url }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="flex-1 items-center justify-center p-2">
          <Ionicons name="document" size={24} color="#6B7280" />
          <Text className="text-xs text-gray-500 mt-1 text-center" numberOfLines={2}>
            {attachment?.FileName || "File"}
          </Text>
        </View>
      )}
      {onRemove && !isUploading && (
        <Pressable
          onPress={onRemove}
          className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
        >
          <Ionicons name="close" size={14} color="white" />
        </Pressable>
      )}
    </View>
  );
}
