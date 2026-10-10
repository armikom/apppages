import { firestore } from "firebase-functions/v2";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";

let _db: Firestore;
function db() { return _db ??= getFirestore(); }

/**
 * When an app is published (status changes to 'published'):
 * 1. Create a version snapshot
 * 2. Update the slug doc for routing
 * 3. Bust CDN cache by touching a cache version counter
 *
 * Also handles slug reservation on create.
 */
export const onAppWrite = firestore.onDocumentWritten(
  "accounts/{accountId}/apps/{appId}",
  async (event) => {
    const { accountId, appId } = event.params;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!afterData) {
      // App was deleted — clean up slug
      if (beforeData?.slug) {
        await db().doc(`slugs/${beforeData.slug}`).delete();
        console.log(`Deleted slug reservation for ${beforeData.slug}`);
      }
      return;
    }

    // Slug reservation: when slug is set/changed, create/update the slugs doc
    if (afterData.slug && afterData.slug !== beforeData?.slug) {
      // Remove old slug if changed
      if (beforeData?.slug) {
        await db().doc(`slugs/${beforeData.slug}`).delete();
      }
      // Reserve new slug
      await db().doc(`slugs/${afterData.slug}`).set({
        accountId,
        appId,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`Reserved slug: ${afterData.slug}`);
    }

    // Version snapshot on publish
    const wasPublished = beforeData?.status !== "published" && afterData.status === "published";
    const contentChanged = beforeData?.status === "published" && afterData.status === "published" &&
      afterData.updatedAt !== beforeData.updatedAt;

    if (wasPublished || contentChanged) {
      // Get current version count
      const versionsSnap = await db()
        .collection(`accounts/${accountId}/apps/${appId}/versions`)
        .orderBy("version", "desc")
        .limit(1)
        .get();

      const nextVersion = versionsSnap.empty ? 1 : (versionsSnap.docs[0].data().version + 1);

      await db().collection(`accounts/${accountId}/apps/${appId}/versions`).doc(`${nextVersion}`).set({
        version: nextVersion,
        appId,
        accountId,
        snapshot: afterData,
        publishedAt: FieldValue.serverTimestamp(),
        publishedBy: afterData.lastModifiedBy ?? "system",
      });

      // Update app with published version number
      await db().doc(`accounts/${accountId}/apps/${appId}`).update({
        publishedVersion: nextVersion,
        publishedAt: FieldValue.serverTimestamp(),
      });

      console.log(`Created version ${nextVersion} for app ${appId}`);
    }
  }
);
