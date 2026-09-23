export type TapFinanceAssistantModule = {
  isAssistantRoleAvailable(): Promise<boolean>;
  isAssistantRoleHeld(): Promise<boolean>;
  requestAssistantRole(): Promise<boolean>;
  openAssistantSettings(): Promise<boolean>;
  startDiagnosticTest(): boolean;
  recordQuickEntryOpened(): void;
  getDiagnosticReport(): string;
};
