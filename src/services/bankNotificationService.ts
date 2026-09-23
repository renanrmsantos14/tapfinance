import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { TransactionType } from "../types/category";

export type BankSuggestion = {
  id: string;
  type: TransactionType;
  amountCents: number;
  description: string;
  occurredAt: number;
};

type BankNotificationModule = {
  hasBankNotificationAccess(): boolean;
  canPostBankAlerts(): boolean;
  openBankNotificationAccessSettings(): Promise<boolean>;
  requestBankAlertPermission(): Promise<boolean>;
  getBankSuggestion(id: string): BankSuggestion | null;
  markBankSuggestionHandled(id: string): void;
};

let native: BankNotificationModule | null = null;
if (Platform.OS === "android") {
  try { native = requireNativeModule<BankNotificationModule>("TapFinanceAssistant"); } catch { native = null; }
}

export function hasBankNotificationAccess(): boolean { return native?.hasBankNotificationAccess() ?? false; }
export function canPostBankAlerts(): boolean { return native?.canPostBankAlerts() ?? false; }
export async function openBankNotificationAccessSettings(): Promise<boolean> { return native?.openBankNotificationAccessSettings() ?? false; }
export async function requestBankAlertPermission(): Promise<boolean> { return native?.requestBankAlertPermission() ?? false; }
export function getBankSuggestion(id: string): BankSuggestion | null { return native?.getBankSuggestion(id) ?? null; }
export function markBankSuggestionHandled(id: string): void { native?.markBankSuggestionHandled(id); }
