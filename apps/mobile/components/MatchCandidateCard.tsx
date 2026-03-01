import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MatchCandidate } from "../types";

interface MatchCandidateCardProps {
  candidate: MatchCandidate;
  isSelected: boolean;
  onConfirm: () => void;
}

export function MatchCandidateCard({
  candidate,
  isSelected,
  onConfirm,
}: MatchCandidateCardProps) {
  const scorePercent = Math.round(candidate.score * 100);
  const isSpend = candidate.type === "SPEND";
  const formattedDate = candidate.date
    ? new Date(candidate.date).toLocaleDateString("en-AU")
    : "";

  return (
    <View
      className={`bg-white rounded-xl p-4 mb-2 border ${
        isSelected ? "border-xero-blue" : "border-gray-100"
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {candidate.contactName}
          </Text>
          <Text className="text-sm text-gray-500">{formattedDate}</Text>
        </View>

        <View className="items-end">
          <Text
            className={`text-lg font-bold ${
              isSpend ? "text-red-600" : "text-green-600"
            }`}
          >
            {isSpend ? "-" : "+"}${Math.abs(candidate.amount).toFixed(2)}
          </Text>
          <View className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-1 ${
                scorePercent >= 85
                  ? "bg-green-500"
                  : scorePercent >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />
            <Text className="text-xs text-gray-500">{scorePercent}% match</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onConfirm}
        className="bg-xero-blue rounded-lg py-2.5 items-center active:bg-xero-dark"
      >
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle" size={18} color="white" />
          <Text className="text-white font-semibold ml-1.5">
            Confirm Match
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
