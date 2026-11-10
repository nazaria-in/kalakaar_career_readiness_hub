import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { ContentType, createDefaultSubmissionTemplate } from "@repo/shared";


export default function HomeScreen() {
  const [count, setCount] = useState(0);

  console.log(createDefaultSubmissionTemplate("assignment" as ContentType));

  return (
    <View className="flex-1 items-center justify-center bg-slate-900 p-6">
      {/* Test 1: Backgrounds & Typography */}
      <View className="mb-6 rounded-2xl bg-slate-800 p-6 shadow-lg border border-slate-700">
        <Text className="text-2xl font-bold text-indigo-400 text-center">
          NativeWind Test
        </Text>
        <Text className="mt-2 text-slate-300 text-center text-base">
          If this box is dark grey with indigo text, Tailwind is rendering.
        </Text>
      </View>

      {/* Test 2: State & Interactivity */}
      <Pressable
        onPress={() => setCount((c) => c + 1)}
        className="active:opacity-80 rounded-xl bg-indigo-600 px-6 py-3 shadow-md"
      >
        <Text className="text-lg font-semibold text-white">
          Pressed {count} times
        </Text>
      </Pressable>
    </View>
  );
}