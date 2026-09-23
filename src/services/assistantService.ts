import { requireNativeModule } from "expo-modules-core";

type AssistantModule = {
  isAssistantRoleAvailable: () => Promise<boolean>;
  isAssistantRoleHeld: () => Promise<boolean>;
  requestAssistantRole: () => Promise<boolean>;
  openAssistantSettings: () => Promise<boolean>;
  startDiagnosticTest: () => boolean;
  recordQuickEntryOpened: () => void;
  getDiagnosticReport: () => string;
  installUpdate: (url: string, digest: string) => Promise<boolean>;
};

let native: AssistantModule | null = null;
try { native = requireNativeModule<AssistantModule>("TapFinanceAssistant"); } catch { native = null; }

export async function isAssistantRoleAvailable(): Promise<boolean> { return native?.isAssistantRoleAvailable() ?? false; }
export async function isAssistantRoleHeld(): Promise<boolean> { return native?.isAssistantRoleHeld() ?? false; }
export async function requestAssistantRole(): Promise<boolean> { return native?.requestAssistantRole() ?? false; }
export async function openAssistantSettings(): Promise<boolean> { return native?.openAssistantSettings() ?? false; }
export function startDiagnosticTest(): boolean { return native?.startDiagnosticTest() ?? false; }
export function recordQuickEntryOpened(): void { native?.recordQuickEntryOpened(); }
export function getDiagnosticReport(): string { return native?.getDiagnosticReport() ?? "TapFinance: módulo nativo indisponível"; }
export async function installUpdate(url: string, digest: string): Promise<boolean> {
  if (!native) throw new Error("Instalação disponível somente no aplicativo Android.");
  return native.installUpdate(url, digest);
}
