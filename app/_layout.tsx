import "../global.css";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { initializeDatabase } from "../src/database/database";

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SQLiteProvider databaseName="tapfinance.db" onInit={initializeDatabase} useSuspense>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
    </SQLiteProvider>
  );
}
