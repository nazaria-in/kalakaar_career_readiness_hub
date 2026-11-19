// apps/mobile/src/components/shell/ComingSoon.tsx
import { StyleSheet, Text, View } from "react-native";

export function ComingSoon({ title }: { title: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{title} — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" },
  text: { fontSize: 15, color: "#6b6b6b" },
});