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
  background: "#171613",
  surface: "#211F1B",
  surfaceMuted: "#2C2924",
  surfaceStrong: "#37322C",
  text: "#F5F1E9",
  textMuted: "#B3ACA0",
  border: "#403B34",
  accent: "#D39472",
  accentSoft: "#443027",
  accentContrast: "#1D1511",
  positive: "#9FC4A2",
  positiveSoft: "#26352A",
  negative: "#E7A19D",
  negativeSoft: "#402A2A",
  warning: "#D8B66D",
  warningSoft: "#3D341F",
};

export function useAppColors() {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

export type AppColors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, round: 999 } as const;
