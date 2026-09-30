import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { SQLiteDatabase } from "expo-sqlite";
import type { TransactionType } from "../types/category";
import { loadTransactionFormReferences, type HistoricalTransactionReferences, type TransactionFormReferences } from "../services/transactionFormService";

export function useTransactionFormReferences(db: SQLiteDatabase, type: TransactionType, historical?: HistoricalTransactionReferences | null) {
  const [revision, setRevision] = useState(0);
  const categoryId = historical?.categoryId; const accountId = historical?.accountId;
  const requestKey = JSON.stringify([type, categoryId, accountId]);
  const [state, setState] = useState<{ requestKey: string; revision: number; data: TransactionFormReferences | null; error: string | null }>({ requestKey: "", revision: -1, data: null, error: null });

  useFocusEffect(useCallback(() => {
    let active = true;
    setState({ requestKey, revision, data: null, error: null });
    void loadTransactionFormReferences(db, type, categoryId && accountId ? { categoryId, accountId } : undefined).then((data) => {
      if (active) setState({ requestKey, revision, data, error: null });
    }).catch((error: unknown) => {
      if (active) setState({ requestKey, revision, data: null, error: error instanceof Error ? error.message : "Não foi possível carregar os cadastros." });
    });
    return () => { active = false; };
  }, [accountId, categoryId, db, requestKey, revision, type]));

  const current = state.requestKey === requestKey && state.revision === revision;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current || (!state.data && !state.error),
    ready: current && !!state.data && !state.error,
    retry: () => setRevision((value) => value + 1),
  };
}
