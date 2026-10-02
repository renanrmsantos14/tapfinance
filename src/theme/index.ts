import { useColorScheme } from "react-native";
import { darkColors, lightColors } from "./palette";

export { darkColors, lightColors, radius, spacing, type AppColors } from "./palette";
export { manrope, manropeFamily, type } from "./fonts";

export function useAppColors() {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}
