export const lightColors = {
  background: "#F3F5F8",
  surface: "#FFFFFF",
  surfaceMuted: "#E9EDF3",
  surfaceStrong: "#DDE2EA",
  text: "#0F1420",
  textMuted: "#5F6675",
  border: "#E3E7EE",
  accent: "#2452D8",
  accentSoft: "#DCE6FF",
  accentContrast: "#FFFFFF",
  accentText: "#2452D8",
  ink: "#0F1420",
  inkText: "#FFFFFF",
  inkMuted: "#9AA3B5",
  positive: "#1A6E40",
  positiveSoft: "#DDF5E3",
  negative: "#B2362F",
  negativeSoft: "#FBE5E3",
  warning: "#8A621C",
  warningSoft: "#F5ECD7",
};

export const darkColors = {
  background: "#0B0D12",
  surface: "#151924",
  surfaceMuted: "#232A3A",
  surfaceStrong: "#2E3647",
  text: "#F2F4F8",
  textMuted: "#9AA3B5",
  border: "#262D3C",
  accent: "#5B8CFF",
  accentSoft: "#182340",
  accentContrast: "#0B0D12",
  accentText: "#9DB8FF",
  ink: "#1A2030",
  inkText: "#FFFFFF",
  inkMuted: "#9AA3B5",
  positive: "#73D092",
  positiveSoft: "#183A32",
  negative: "#F17E88",
  negativeSoft: "#412733",
  warning: "#E6BD65",
  warningSoft: "#3C3526",
};

export type AppColors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 40 } as const;
export const radius = { sm: 12, md: 16, lg: 20, xl: 24, round: 999 } as const;
