import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";
import type { AppData } from "@apppages/shared";

export function useApps() {
  const { profile } = useAuth();
  const [apps, setApps] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(true);

  const accountId = profile?.defaultAccountId;

  useEffect(() => {
    if (!accountId) {
      setApps([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `accounts/${accountId}/apps`),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AppData[];
      setApps(appList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [accountId]);

  const createApp = useCallback(
    async (data: Partial<AppData>) => {
      if (!accountId) throw new Error("No account");

      // Reserve slug with a transaction
      const slug = data.slug!;
      await runTransaction(db, async (transaction) => {
        const slugRef = doc(db, `slugs/${slug}`);
        const slugDoc = await transaction.get(slugRef);
        if (slugDoc.exists()) {
          throw new Error("Slug is already taken");
        }

        const appRef = doc(collection(db, `accounts/${accountId}/apps`));
        transaction.set(slugRef, {
          accountId,
          appId: appRef.id,
          createdAt: serverTimestamp(),
        });
        transaction.set(appRef, {
          ...data,
          accountId,
          status: "draft",
          publishedVersion: null,
          publishedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    },
    [accountId]
  );

  const updateApp = useCallback(
    async (appId: string, data: Partial<AppData>) => {
      if (!accountId) throw new Error("No account");
      await updateDoc(doc(db, `accounts/${accountId}/apps/${appId}`), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [accountId]
  );

  const publishApp = useCallback(
    async (appId: string) => {
      if (!accountId) throw new Error("No account");
      await updateDoc(doc(db, `accounts/${accountId}/apps/${appId}`), {
        status: "published",
        updatedAt: serverTimestamp(),
      });
    },
    [accountId]
  );

  const deleteApp = useCallback(
    async (appId: string) => {
      if (!accountId) throw new Error("No account");
      await deleteDoc(doc(db, `accounts/${accountId}/apps/${appId}`));
    },
    [accountId]
  );

  const duplicateApp = useCallback(
    async (sourceApp: AppData, newSlug: string) => {
      const { id, slug, status, publishedVersion, publishedAt, createdAt, updatedAt, ...rest } = sourceApp;
      await createApp({ ...rest, slug: newSlug, name: `${sourceApp.name} (Copy)` });
    },
    [createApp]
  );

  return { apps, loading, createApp, updateApp, publishApp, deleteApp, duplicateApp };
}
