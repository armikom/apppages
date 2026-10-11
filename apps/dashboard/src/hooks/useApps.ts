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
import { createLogger } from "../lib/logger";
import type { AppData } from "@apppages/shared";

const log = createLogger("useApps");

export function useApps() {
  const { profile } = useAuth();
  const [apps, setApps] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(true);

  const accountId = profile?.defaultAccountId;

  useEffect(() => {
    if (!accountId) {
      log.debug("No accountId, clearing apps list");
      setApps([]);
      setLoading(false);
      return;
    }

    log.info("Subscribing to apps collection", { accountId });
    const q = query(
      collection(db, `accounts/${accountId}/apps`),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AppData[];
        setApps(appList);
        setLoading(false);
        log.info("Apps snapshot received", {
          count: appList.length,
          appIds: appList.map((a) => a.id),
        });
      },
      (err) => {
        log.error("Apps snapshot listener error", err, { accountId });
        setLoading(false);
      }
    );

    return () => {
      log.debug("Unsubscribing from apps collection", { accountId });
      unsubscribe();
    };
  }, [accountId]);

  const createApp = useCallback(
    async (data: Partial<AppData>) => {
      if (!accountId) throw new Error("No account");

      const slug = data.slug!;
      log.info("Creating app", { slug, name: data.name, accountId });
      const done = log.time(`createApp:${slug}`);
      try {
        await runTransaction(db, async (transaction) => {
          const slugRef = doc(db, `slugs/${slug}`);
          const slugDoc = await transaction.get(slugRef);
          if (slugDoc.exists()) {
            log.warn("Slug already taken", { slug });
            throw new Error("Slug is already taken");
          }

          const appRef = doc(collection(db, `accounts/${accountId}/apps`));
          log.debug("Reserving slug and creating app doc", {
            slug,
            appId: appRef.id,
          });
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
        done();
        log.info("App created successfully", { slug });
      } catch (err) {
        log.error("App creation failed", err, { slug, accountId });
        throw err;
      }
    },
    [accountId]
  );

  const updateApp = useCallback(
    async (appId: string, data: Partial<AppData>) => {
      if (!accountId) throw new Error("No account");
      log.info("Updating app", { appId, fields: Object.keys(data) });
      try {
        await updateDoc(doc(db, `accounts/${accountId}/apps/${appId}`), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        log.info("App updated successfully", { appId });
      } catch (err) {
        log.error("App update failed", err, { appId, accountId });
        throw err;
      }
    },
    [accountId]
  );

  const publishApp = useCallback(
    async (appId: string) => {
      if (!accountId) throw new Error("No account");
      log.info("Publishing app", { appId, accountId });
      try {
        await updateDoc(doc(db, `accounts/${accountId}/apps/${appId}`), {
          status: "published",
          updatedAt: serverTimestamp(),
        });
        log.info("App published successfully", { appId });
      } catch (err) {
        log.error("App publish failed", err, { appId, accountId });
        throw err;
      }
    },
    [accountId]
  );

  const deleteApp = useCallback(
    async (appId: string) => {
      if (!accountId) throw new Error("No account");
      log.warn("Deleting app", { appId, accountId });
      try {
        await deleteDoc(doc(db, `accounts/${accountId}/apps/${appId}`));
        log.info("App deleted successfully", { appId });
      } catch (err) {
        log.error("App deletion failed", err, { appId, accountId });
        throw err;
      }
    },
    [accountId]
  );

  const duplicateApp = useCallback(
    async (sourceApp: AppData, newSlug: string) => {
      log.info("Duplicating app", { sourceAppId: sourceApp.id, newSlug });
      const { id, slug, status, publishedVersion, publishedAt, createdAt, updatedAt, ...rest } = sourceApp;
      await createApp({ ...rest, slug: newSlug, name: `${sourceApp.name} (Copy)` });
      log.info("App duplicated successfully", { sourceAppId: sourceApp.id, newSlug });
    },
    [createApp]
  );

  return { apps, loading, createApp, updateApp, publishApp, deleteApp, duplicateApp };
}
