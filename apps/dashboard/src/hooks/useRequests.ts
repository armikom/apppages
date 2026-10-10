import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";
import type { PublicRequest, RequestStatus } from "@apppages/shared";

export function useRequests(appId?: string) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const accountId = profile?.defaultAccountId;

  useEffect(() => {
    if (!accountId || !appId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `accounts/${accountId}/apps/${appId}/requests`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PublicRequest[];
      setRequests(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [accountId, appId]);

  const updateRequestStatus = useCallback(
    async (appId: string, requestId: string, status: RequestStatus, notes?: string) => {
      if (!accountId) throw new Error("No account");
      const updates: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (notes !== undefined) updates.notes = notes;
      if (status === "done" || status === "rejected") {
        updates.resolvedAt = serverTimestamp();
      }
      await updateDoc(doc(db, `accounts/${accountId}/apps/${appId}/requests/${requestId}`), updates);
    },
    [accountId]
  );

  return { requests, loading, updateRequestStatus };
}
