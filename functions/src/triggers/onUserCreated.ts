import * as functions from "firebase-functions/v1";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";

let _db: Firestore;
function db() { return _db ??= getFirestore(); }

/**
 * When a new user signs up:
 * 1. Create a user profile doc
 * 2. Create a personal account
 * 3. Add the user as owner of the account
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  const batch = db().batch();

  // Create user profile
  const userRef = db().doc(`users/${uid}`);
  batch.set(userRef, {
    uid,
    displayName: displayName ?? email?.split("@")[0] ?? "User",
    email: email ?? "",
    photoURL: photoURL ?? null,
    role: "user",
    plan: "free",
    defaultAccountId: uid, // personal account uses uid as ID
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Create personal account (using uid as account ID for simplicity)
  const accountRef = db().doc(`accounts/${uid}`);
  batch.set(accountRef, {
    id: uid,
    name: `${displayName ?? email?.split("@")[0] ?? "User"}'s Apps`,
    ownerId: uid,
    plan: "free",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Add user as owner member
  const memberRef = db().doc(`accounts/${uid}/members/${uid}`);
  batch.set(memberRef, {
    uid,
    role: "owner",
    email: email ?? "",
    displayName: displayName ?? email?.split("@")[0] ?? "User",
    joinedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`Created user profile and account for ${uid}`);
});
