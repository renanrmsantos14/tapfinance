export type TapFinanceAssistantModule = {
  isAssistantRoleAvailable(): Promise<boolean>;
  isAssistantRoleHeld(): Promise<boolean>;
  requestAssistantRole(): Promise<boolean>;
  openAssistantSettings(): Promise<boolean>;
  startDiagnosticTest(): boolean;
  recordQuickEntryOpened(): void;
  getDiagnosticReport(): string;
  installUpdate(url: string, digest: string): Promise<boolean>;
  hasBankNotificationAccess(): boolean;
  canPostBankAlerts(): boolean;
  openBankNotificationAccessSettings(): Promise<boolean>;
  requestBankAlertPermission(): Promise<boolean>;
  getBankSuggestion(id: string): { id: string; type: "expense" | "income"; amountCents: number; description: string; occurredAt: number } | null;
  markBankSuggestionHandled(id: string): void;
};
