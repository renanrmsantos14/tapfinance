import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Inbox } from "lucide-react-native";
import { radius, useAppColors } from "../theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>{children}</View>;
  return scroll ? <View style={styles.flex}>{content}</View> : content;
}

export function Label({ children }: { children: ReactNode }) {
  const colors = useAppColors();
  return <Text style={[styles.label, { color: colors.textMuted }]}>{children}</Text>;
}

export function PrimaryButton({ children, style, onPress, disabled, accessibilityLabel }: { children: ReactNode; onPress?: PressableProps["onPress"]; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const colors = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.text, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.primaryButtonText, { color: colors.background }]}>{children}</Text>
    </Pressable>
  );
}

export function QuietButton({ children, onPress, style, accessibilityLabel }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const colors = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.quietButton, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 160 : 220, delay, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: reduceMotion ? 0 : 220, delay, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, reduceMotion, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useAppColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.sectionAction, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.sectionActionText, { color: colors.accent }]}>{actionLabel}</Text>
          <ArrowRight color={colors.accent} size={15} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useAppColors();
  return (
    <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceMuted }]}><Inbox color={colors.textMuted} size={21} /></View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>{description}</Text>
      {actionLabel && onAction ? <PrimaryButton onPress={onAction} style={styles.emptyAction}>{actionLabel}</PrimaryButton> : null}
    </View>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  const colors = useAppColors();
  return <View accessibilityLabel="Carregando" style={styles.skeletonList}>{Array.from({ length: count }, (_, index) => <View key={index} style={styles.skeletonRow}><View style={[styles.skeletonCircle, { backgroundColor: colors.surfaceMuted }]} /><View style={styles.skeletonCopy}><View style={[styles.skeletonLine, { backgroundColor: colors.surfaceMuted, width: "56%" }]} /><View style={[styles.skeletonLine, { backgroundColor: colors.surfaceMuted, width: "34%" }]} /></View><View style={[styles.skeletonLine, { backgroundColor: colors.surfaceMuted, width: 64 }]} /></View>)}</View>;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 1.1, textTransform: "uppercase" },
  primaryButton: { minHeight: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, flexDirection: "row", gap: 9 },
  primaryButtonText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  quietButton: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  sectionHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 19, fontWeight: "700", letterSpacing: -0.35 },
  sectionAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  sectionActionText: { fontSize: 13, fontWeight: "700" },
  emptyCard: { borderWidth: 1, borderRadius: radius.lg, padding: 24, alignItems: "center" },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyDescription: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 270 },
  emptyAction: { alignSelf: "stretch", marginTop: 18 },
  skeletonList: { gap: 6 },
  skeletonRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12 },
  skeletonCircle: { width: 40, height: 40, borderRadius: 20 },
  skeletonCopy: { flex: 1, gap: 8 },
  skeletonLine: { height: 10, borderRadius: 5 },
});
