import { Children, useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { ArrowLeft, Inbox, type LucideIcon } from "lucide-react-native";
import { radius, type, useAppColors } from "../theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>{children}</View>;
  return scroll ? <View style={styles.flex}>{content}</View> : content;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const colors = useAppColors();
  return <Text style={[type.eyebrow, { color: colors.textMuted }, style]}>{children}</Text>;
}

/** Bento block: rounded surface with a 1px border, or an "ink" block with inverted text. */
export function Tile({ children, ink = false, tone, style, onPress, accessibilityLabel, accessibilityHint, span = false }: { children: ReactNode; ink?: boolean; tone?: "accent" | "negative"; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; accessibilityHint?: string; span?: boolean }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const base: ViewStyle = ink
    ? { backgroundColor: colors.ink }
    : tone === "accent" ? { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft, borderWidth: 1 }
    : { backgroundColor: colors.surface, borderColor: tone === "negative" ? colors.negative : colors.border, borderWidth: 1 };
  const spanStyle = span ? styles.tileSpan : null;
  if (!onPress) return <View style={[styles.tile, base, spanStyle, style]}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} onPress={onPress} style={({ pressed }) => [styles.tile, base, spanStyle, { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed && reduceMotion === false ? 0.985 : 1 }] }, style]}>{children}</Pressable>;
}

export function BentoGrid({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

export function IconBox({ icon: Icon, color, background, size = 36 }: { icon: LucideIcon; color: string; background: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: Math.round(size / 3), backgroundColor: background, alignItems: "center", justifyContent: "center" }}><Icon color={color} size={Math.round(size / 2)} strokeWidth={2.2} /></View>;
}

export function Chip({ label, selected = false, onPress, disabled = false, dashed = false, accessibilityRole = "button", accessibilityLabel, icon: Icon, style }: { label: string; selected?: boolean; onPress?: () => void; disabled?: boolean; dashed?: boolean; accessibilityRole?: "button" | "radio" | "tab" | "checkbox"; accessibilityLabel?: string; icon?: LucideIcon; style?: StyleProp<ViewStyle> }) {
  const colors = useAppColors();
  const textColor = selected ? colors.accentContrast : dashed ? colors.accentText : colors.text;
  return <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityState={{ selected, disabled, ...(accessibilityRole === "checkbox" ? { checked: selected } : {}) }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.chip, { backgroundColor: selected ? colors.accent : dashed ? "transparent" : colors.surface, borderColor: selected ? colors.accent : dashed ? colors.accentText : colors.border, borderStyle: dashed ? "dashed" : "solid", opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }, style]}>
    {Icon ? <Icon color={textColor} size={15} strokeWidth={2.4} /> : null}
    <Text numberOfLines={1} style={[type.chip, { color: textColor }]}>{label}</Text>
  </Pressable>;
}

/** Progress ring. `value` is 0–1; above 1 it fills and turns negative. */
export function Ring({ value, size = 72, stroke = 9, label, color, track, textColor }: { value: number; size?: number; stroke?: number; label?: string; color?: string; track?: string; textColor?: string }) {
  const colors = useAppColors();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(value, 1));
  const ringColor = color ?? (value > 1 ? colors.negative : colors.accent);
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessible={false}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? colors.surfaceMuted} strokeWidth={stroke} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - clamped)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
    </Svg>
    {label ? <Text style={[styles.ringLabel, { color: textColor ?? colors.text, fontSize: Math.max(12, Math.round(size / 4.8)) }]}>{label}</Text> : null}
  </View>;
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
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.accent, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed && reduceMotion === false ? 0.97 : 1 }] }, style]}
      disabled={disabled}
      onPress={onPress}
    >
      {Children.toArray(children).map((child, index) => typeof child === "string" || typeof child === "number"
        ? <Text key={index} style={[styles.primaryButtonText, { color: colors.accentContrast }]}>{child}</Text>
        : child)}
    </Pressable>
  );
}

export function QuietButton({ children, onPress, style, accessibilityLabel, disabled = false, framed = false }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; disabled?: boolean; framed?: boolean }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.quietButton, framed && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 40, minWidth: 40, borderRadius: 14 }, { opacity: disabled ? 0.5 : 1, backgroundColor: pressed ? colors.surfaceMuted : framed ? colors.surface : "transparent", transform: [{ scale: pressed && reduceMotion === false ? 0.96 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Reveal({ children, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  // Financial data stays visible immediately, without decorative entrance delays.
  return <View style={style}>{children}</View>;
}

export function FormHeader({ title, subtitle, onBack, disabled = false, right }: { title: string; subtitle?: string; onBack: () => void; disabled?: boolean; right?: ReactNode }) {
  const colors = useAppColors();
  return <View style={styles.formHeader}>
    <QuietButton framed accessibilityLabel="Voltar" onPress={onBack} disabled={disabled}><ArrowLeft color={colors.text} size={18} strokeWidth={2.4} /></QuietButton>
    <View style={styles.formHeaderCopy}><Text accessibilityRole="header" numberOfLines={1} style={[type.h2, { color: colors.text, textAlign: "center" }]}>{title}</Text>{subtitle && <Text numberOfLines={1} style={[type.metaStrong, { color: colors.textMuted, textAlign: "center" }]}>{subtitle}</Text>}</View>
    <View style={{ width: 40, alignItems: "flex-end" }}>{right}</View>
  </View>;
}

export function SectionHeader({ title, actionLabel, onAction, eyebrow = false }: { title: string; actionLabel?: string; onAction?: () => void; eyebrow?: boolean }) {
  const colors = useAppColors();
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={eyebrow ? [type.eyebrow, { color: colors.textMuted }] : [type.h2, { color: colors.text, flexShrink: 1 }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.sectionAction, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[type.chip, { color: colors.accentText }]}>{actionLabel}</Text>
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
      <Text style={[type.bodyStrong, { color: colors.text, marginBottom: 6 }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>{description}</Text>
      {actionLabel && onAction ? <PrimaryButton onPress={onAction} style={styles.emptyAction}>{actionLabel}</PrimaryButton> : null}
    </View>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  const colors = useAppColors();
  return <View accessibilityLabel="Carregando" style={styles.skeletonList}>{Array.from({ length: count }, (_, index) => <View key={index} style={styles.skeletonRow}><View style={[styles.skeletonCircle, { backgroundColor: colors.surfaceMuted }]} /><View style={styles.skeletonCopy}><View style={[styles.skeletonLine, { backgroundColor: colors.surfaceMuted, width: "56%" }]} /><View style={[styles.skeletonLine, { backgroundColor: colors.surfaceMuted, width: "34%" }]} /></View></View>)}</View>;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 16 },
  tile: { borderRadius: radius.xl, padding: 16, minWidth: 0 },
  tileSpan: { width: "100%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { minHeight: 40, maxWidth: 240, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.sm },
  ringLabel: { position: "absolute", fontFamily: "Manrope_800ExtraBold", fontVariant: ["tabular-nums"] },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  formHeaderCopy: { flex: 1, minWidth: 0, gap: 2, alignItems: "center" },
  primaryButton: { minHeight: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, flexDirection: "row", gap: 9 },
  primaryButtonText: { flexShrink: 1, fontFamily: "Manrope_800ExtraBold", fontSize: 16, textAlign: "center" },
  quietButton: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  sectionHeader: { minHeight: 44, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 12, paddingHorizontal: 4 },
  sectionAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  emptyCard: { borderWidth: 1, borderRadius: radius.xl, padding: 24, alignItems: "center" },
  emptyEmbedded: { paddingHorizontal: 24, paddingVertical: 30, alignItems: "center" },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyDescription: { fontFamily: "Manrope_600SemiBold", fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 270 },
  emptyAction: { alignSelf: "stretch", marginTop: 18 },
  skeletonList: { gap: 6 },
  skeletonRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12 },
  skeletonCircle: { width: 40, height: 40, borderRadius: 14 },
  skeletonCopy: { flex: 1, gap: 8 },
  skeletonLine: { height: 10, borderRadius: 5 },
});
