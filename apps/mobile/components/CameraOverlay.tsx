import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CameraOverlayProps {
  imageUri: string | null;
  isUploading: boolean;
  onCapture: () => void;
  onPickFromLibrary: () => void;
  onPickFromFiles?: () => void;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

export function CameraOverlay({
  imageUri,
  isUploading,
  onCapture,
  onPickFromLibrary,
  onPickFromFiles,
  onConfirm,
  onRetake,
  onCancel,
}: CameraOverlayProps) {
  if (imageUri) {
    return (
      <View className="flex-1 bg-black">
        <Image
          source={{ uri: imageUri }}
          className="flex-1"
          resizeMode="contain"
        />
        {isUploading ? (
          <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-6 items-center">
            <ActivityIndicator size="large" color="#13B5EA" />
            <Text className="text-white text-lg mt-3">Uploading receipt...</Text>
          </View>
        ) : (
          <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-6">
            <View className="flex-row justify-center gap-6">
              <Pressable
                onPress={onRetake}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
                  <Ionicons name="refresh" size={24} color="white" />
                </View>
                <Text className="text-white text-sm mt-2">Retake</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-xero-blue items-center justify-center">
                  <Ionicons name="checkmark" size={28} color="white" />
                </View>
                <Text className="text-white text-sm mt-2">Use Photo</Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
                  <Ionicons name="close" size={24} color="white" />
                </View>
                <Text className="text-white text-sm mt-2">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-8">
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-xero-blue/10 items-center justify-center mb-4">
          <Ionicons name="camera" size={48} color="#13B5EA" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Capture Receipt
        </Text>
        <Text className="text-gray-500 text-center">
          Take a photo of your receipt or choose from your photo library
        </Text>
      </View>

      <View className="w-full gap-3">
        <Pressable
          onPress={onCapture}
          className="bg-xero-blue rounded-xl py-4 items-center active:bg-xero-dark"
        >
          <View className="flex-row items-center">
            <Ionicons name="camera" size={22} color="white" />
            <Text className="text-white text-lg font-semibold ml-2">
              Take Photo
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onPickFromLibrary}
          className="bg-white border border-gray-200 rounded-xl py-4 items-center active:bg-gray-50"
        >
          <View className="flex-row items-center">
            <Ionicons name="images" size={22} color="#374151" />
            <Text className="text-gray-700 text-lg font-semibold ml-2">
              Choose from Library
            </Text>
          </View>
        </Pressable>

        {onPickFromFiles && (
          <Pressable
            onPress={onPickFromFiles}
            className="bg-white border border-gray-200 rounded-xl py-4 items-center active:bg-gray-50"
          >
            <View className="flex-row items-center">
              <Ionicons name="document" size={22} color="#374151" />
              <Text className="text-gray-700 text-lg font-semibold ml-2">
                From Files
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
