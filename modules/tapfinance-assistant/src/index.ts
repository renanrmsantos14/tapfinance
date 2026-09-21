export type TapFinanceAssistantModule = {
  isAssistantRoleAvailable(): Promise<boolean>;
  isAssistantRoleHeld(): Promise<boolean>;
  requestAssistantRole(): Promise<boolean>;
  openAssistantSettings(): Promise<boolean>;
};
