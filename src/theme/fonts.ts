import { StyleSheet, type TextStyle } from "react-native";

export const manrope = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;

export function manropeFamily(weight?: TextStyle["fontWeight"]): string {
  const value = weight === undefined ? 400 : weight === "bold" ? 700 : weight === "normal" ? 400 : Number(weight);
  if (value >= 800) return manrope.extrabold;
  if (value >= 700) return manrope.bold;
  if (value >= 600) return manrope.semibold;
  if (value >= 500) return manrope.medium;
  return manrope.regular;
}

/** Shared text styles for the Bento UI. Weight comes from the font file, never synthesized. */
export const type = StyleSheet.create({
  eyebrow: { fontFamily: manrope.extrabold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  h1: { fontFamily: manrope.extrabold, fontSize: 24, letterSpacing: -0.8 },
  h2: { fontFamily: manrope.extrabold, fontSize: 17, letterSpacing: -0.3 },
  hero: { fontFamily: manrope.extrabold, fontSize: 40, letterSpacing: -1.4, fontVariant: ["tabular-nums"] },
  stat: { fontFamily: manrope.extrabold, fontSize: 22, letterSpacing: -0.6, fontVariant: ["tabular-nums"] },
  body: { fontFamily: manrope.semibold, fontSize: 15 },
  bodyStrong: { fontFamily: manrope.bold, fontSize: 15 },
  amount: { fontFamily: manrope.extrabold, fontSize: 15, fontVariant: ["tabular-nums"] },
  meta: { fontFamily: manrope.semibold, fontSize: 12 },
  metaStrong: { fontFamily: manrope.bold, fontSize: 12 },
  chip: { fontFamily: manrope.bold, fontSize: 13 },
});
