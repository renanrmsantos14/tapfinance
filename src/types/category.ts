export type TransactionType = "expense" | "income";

export type Category = {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  position: number;
  parentId: string | null;
  color: string;
  isActive: boolean;
};
