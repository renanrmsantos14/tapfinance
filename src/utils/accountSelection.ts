import type { Account } from "../types/finance";

export function resolveTransferSelection(accounts: Account[], current: { fromId: string | null; toId: string | null }) {
  const active = accounts.filter((account) => !account.isArchived);
  const fromId = active.some((account) => account.id === current.fromId) ? current.fromId : active.find((account) => account.isPrimary)?.id ?? active[0]?.id ?? null;
  const source = active.find((account) => account.id === fromId);
  const targets = active.filter((account) => account.id !== fromId && account.currency === source?.currency);
  const toId = targets.some((account) => account.id === current.toId) ? current.toId : targets[0]?.id ?? null;
  return { fromId, toId };
}
