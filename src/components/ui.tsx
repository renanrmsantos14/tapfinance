import { Children, useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Inbox } from "lucide-react-native";
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

export function useReducedMotion(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted && !changed) setEnabled(value);
    }).catch(() => { if (mounted && !changed) setEnabled(true); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      changed = true;
      if (mounted) setEnabled(value);
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return enabled;
}

export function PrimaryButton({ children, style, onPress, disabled, accessibilityLabel }: { children: ReactNode; onPress?: PressableProps["onPress"]; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.text, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed && reduceMotion === false ? 0.97 : 1 }] }, style]}
      disabled={disabled}
      onPress={onPress}
    >
      {Children.toArray(children).map((child, index) => typeof child === "string" || typeof child === "number"
        ? <Text key={index} style={[styles.primaryButtonText, { color: colors.background }]}>{child}</Text>
        : child)}
    </Pressable>
  );
}

export function QuietButton({ children, onPress, style, accessibilityLabel, disabled = false }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; disabled?: boolean }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.quietButton, { opacity: disabled ? 0.5 : 1, backgroundColor: pressed ? colors.surfaceMuted : "transparent", transform: [{ scale: pressed && reduceMotion === false ? 0.96 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Reveal({ children, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  // Financial data stays visible immediately, without decorative entrance delays.
  return <View style={style}>{children}</View>;
}

export function FormHeader({ title, subtitle, onBack, disabled = false }: { title: string; subtitle?: string; onBack: () => void; disabled?: boolean }) {
  const colors = useAppColors();
  return <View style={styles.formHeader}>
    <QuietButton accessibilityLabel="Voltar" onPress={onBack} disabled={disabled}><ArrowLeft color={colors.text} size={22} /></QuietButton>
    <View style={styles.formHeaderCopy}><Text accessibilityRole="header" style={[styles.formHeaderTitle, { color: colors.text }]}>{title}</Text>{subtitle && <Text style={[styles.formHeaderSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}</View>
  </View>;
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

export function EmptyState({ title, description, actionLabel, onAction, embedded = false }: { title: string; description: string; actionLabel?: string; onAction?: () => void; embedded?: boolean }) {
  const colors = useAppColors();
  return (
    <View style={embedded ? styles.emptyEmbedded : [styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  formHeaderCopy: { flex: 1, minWidth: 0, gap: 4 },
  formHeaderTitle: { fontSize: 20, fontWeight: "600", letterSpacing: -0.3 },
  formHeaderSubtitle: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 1.1, textTransform: "uppercase" },
  primaryButton: { minHeight: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, flexDirection: "row", gap: 9 },
  primaryButtonText: { flexShrink: 1, fontSize: 15, fontWeight: "600", textAlign: "center" },
  quietButton: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  sectionHeader: { minHeight: 48, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600", letterSpacing: -0.25, flexShrink: 1 },
  sectionAction: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 4 },
  sectionActionText: { fontSize: 13, fontWeight: "700" },
  emptyCard: { borderWidth: 1, borderRadius: radius.lg, padding: 24, alignItems: "center" },
  emptyEmbedded: { paddingHorizontal: 24, paddingVertical: 30, alignItems: "center" },
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
