import { useColorScheme } from "react-native";

export const lightColors = {
  background: "#fbfaf7",
  surface: "#ffffff",
  surfaceMuted: "#f3f0ea",
  text: "#242321",
  textMuted: "#77736c",
  border: "#e7e3db",
  accent: "#8e5c42",
  accentSoft: "#f1e4dc",
  positive: "#346538",
  positiveSoft: "#edf3ec",
  negative: "#9f2f2d",
  negativeSoft: "#fdebec",
  warning: "#956400",
  warningSoft: "#fbf3db",
};

export const darkColors = {
  background: "#191816",
  surface: "#24221f",
  surfaceMuted: "#302d28",
  text: "#f6f2eb",
  textMuted: "#b3aca1",
  border: "#403b34",
  accent: "#d59a7b",
  accentSoft: "#463229",
  positive: "#a6c9a5",
  positiveSoft: "#29372a",
  negative: "#f0aaa7",
  negativeSoft: "#432c2d",
  warning: "#e2c27b",
  warningSoft: "#403720",
};

export function useAppColors() {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

export type AppColors = typeof lightColors;
