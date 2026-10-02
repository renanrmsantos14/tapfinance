import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { initializeDatabase } from "../src/database/database";
import { darkColors, lightColors } from "../src/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!fontsLoaded && !fontError) return <View style={[styles.canvas, { backgroundColor: colors.background }]} />;
  return (
    <View style={[styles.canvas, { backgroundColor: colors.background }]}>
      <View style={[styles.appShell, Platform.OS === "web" && styles.webShell]}>
        <SQLiteProvider databaseName="tapfinance.db" onInit={initializeDatabase} useSuspense>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false, animation: "none" }} />
        </SQLiteProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  appShell: { flex: 1, width: "100%" },
  webShell: { maxWidth: 480, alignSelf: "center" },
});
