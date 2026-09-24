import { useColorScheme } from "react-native";

export const lightColors = {
  background: "#F7F5F0",
  surface: "#FEFDFB",
  surfaceMuted: "#EFEBE3",
  surfaceStrong: "#E7E0D6",
  text: "#211F1B",
  textMuted: "#716C63",
  border: "#DED8CE",
  accent: "#9A573A",
  accentSoft: "#F2E3DA",
  accentContrast: "#FFF9F4",
  positive: "#35613E",
  positiveSoft: "#E8F0E8",
  negative: "#9B3B38",
  negativeSoft: "#F7E5E3",
  warning: "#8A621C",
  warningSoft: "#F5ECD7",
};

export const darkColors = {
  background: "#070D17",
  surface: "#0E2030",
  surfaceMuted: "#172A3D",
  surfaceStrong: "#243B52",
  text: "#F3F7FF",
  textMuted: "#9AAABC",
  border: "#26384A",
  accent: "#8DB9EA",
  accentSoft: "#263E58",
  accentContrast: "#091421",
  positive: "#73D092",
  positiveSoft: "#183A32",
  negative: "#F17E88",
  negativeSoft: "#412733",
  warning: "#E6BD65",
  warningSoft: "#3C3526",
};

export function useAppColors() {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

export type AppColors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, round: 999 } as const;
