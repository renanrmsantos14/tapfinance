export type AccountType = "checking" | "cash" | "savings" | "credit" | "investment";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  color: string;
  openingBalanceCents: number;
  balanceCents: number;
  position: number;
  isPrimary: boolean;
  isArchived: boolean;
};

export type BudgetCycle = "weekly" | "monthly" | "custom";

export type Budget = {
  id: string;
  name: string;
  amountCents: number;
  spentCents: number;
  color: string;
  cycle: BudgetCycle;
  startAt: number;
  endAt: number | null;
  isArchived: boolean;
};

export type Goal = {
  id: string;
  name: string;
  type: "income" | "expense";
  targetCents: number;
  progressCents: number;
  color: string;
  dueAt: number | null;
  isArchived: boolean;
};

export type Loan = {
  id: string;
  name: string;
  direction: "lent" | "borrowed";
  principalCents: number;
  remainingCents: number;
  color: string;
  dueAt: number | null;
  isArchived: boolean;
};

export type Schedule = {
  id: string;
  title: string;
  type: "expense" | "income";
  amountCents: number;
  accountId: string;
  categoryId: string;
  frequency: "once" | "weekly" | "monthly" | "yearly";
  nextAt: number;
  isSubscription: boolean;
  isActive: boolean;
};
