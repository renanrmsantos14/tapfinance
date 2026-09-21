import { requireNativeModule } from "expo-modules-core";

type AssistantModule = {
  isAssistantRoleAvailable: () => Promise<boolean>;
  isAssistantRoleHeld: () => Promise<boolean>;
  requestAssistantRole: () => Promise<boolean>;
  openAssistantSettings: () => Promise<boolean>;
};

let native: AssistantModule | null = null;
try { native = requireNativeModule<AssistantModule>("TapFinanceAssistant"); } catch { native = null; }

export async function isAssistantRoleAvailable(): Promise<boolean> { return native?.isAssistantRoleAvailable() ?? false; }
export async function isAssistantRoleHeld(): Promise<boolean> { return native?.isAssistantRoleHeld() ?? false; }
export async function requestAssistantRole(): Promise<boolean> { return native?.requestAssistantRole() ?? false; }
export async function openAssistantSettings(): Promise<boolean> { return native?.openAssistantSettings() ?? false; }
