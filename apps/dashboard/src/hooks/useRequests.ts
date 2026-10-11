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
import { createLogger } from "../lib/logger";
import type { PublicRequest, RequestStatus } from "@apppages/shared";

const log = createLogger("useRequests");

export function useRequests(appId?: string) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const accountId = profile?.defaultAccountId;

  useEffect(() => {
    if (!accountId || !appId) {
      log.debug("No accountId or appId, clearing requests", { accountId, appId });
      setRequests([]);
      setLoading(false);
      return;
    }

    log.info("Subscribing to requests collection", { accountId, appId });
    const q = query(
      collection(db, `accounts/${accountId}/apps/${appId}/requests`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PublicRequest[];
        setRequests(list);
        setLoading(false);
        log.info("Requests snapshot received", {
          count: list.length,
          appId,
          statuses: list.reduce(
            (acc, r) => {
              acc[r.status] = (acc[r.status] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        });
      },
      (err) => {
        log.error("Requests snapshot listener error", err, { accountId, appId });
        setLoading(false);
      }
    );

    return () => {
      log.debug("Unsubscribing from requests collection", { appId });
      unsubscribe();
    };
  }, [accountId, appId]);

  const updateRequestStatus = useCallback(
    async (appId: string, requestId: string, status: RequestStatus, notes?: string) => {
      if (!accountId) throw new Error("No account");
      log.info("Updating request status", { appId, requestId, status, hasNotes: !!notes });
      try {
        const updates: Record<string, unknown> = {
          status,
          updatedAt: serverTimestamp(),
        };
        if (notes !== undefined) updates.notes = notes;
        if (status === "done" || status === "rejected") {
          updates.resolvedAt = serverTimestamp();
        }
        await updateDoc(doc(db, `accounts/${accountId}/apps/${appId}/requests/${requestId}`), updates);
        log.info("Request status updated", { requestId, status });
      } catch (err) {
        log.error("Request status update failed", err, { appId, requestId, status });
        throw err;
      }
    },
    [accountId]
  );

  return { requests, loading, updateRequestStatus };
}
