export const lightColors = {
  background: "#FAFAF9",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F0ED",
  surfaceStrong: "#E5E5E0",
  text: "#20211F",
  textMuted: "#686A64",
  border: "#E3E4DF",
  accent: "#424B40",
  accentSoft: "#E9EDE7",
  accentContrast: "#FFFFFF",
  positive: "#35613E",
  positiveSoft: "#E8F0E8",
  negative: "#9B3B38",
  negativeSoft: "#F7E5E3",
  warning: "#8A621C",
  warningSoft: "#F5ECD7",
};

export const darkColors = {
  background: "#151614",
  surface: "#1D1F1B",
  surfaceMuted: "#272A25",
  surfaceStrong: "#343830",
  text: "#F4F5F0",
  textMuted: "#A8ADA2",
  border: "#353930",
  accent: "#CCD6C5",
  accentSoft: "#30382B",
  accentContrast: "#151614",
  positive: "#73D092",
  positiveSoft: "#183A32",
  negative: "#F17E88",
  negativeSoft: "#412733",
  warning: "#E6BD65",
  warningSoft: "#3C3526",
};

export type AppColors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, round: 999 } as const;
