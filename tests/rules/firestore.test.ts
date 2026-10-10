import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

let testEnv: RulesTestEnvironment;

const RULES_PATH = resolve(__dirname, "../../firestore.rules");

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-apppages-test",
    firestore: {
      rules: readFileSync(RULES_PATH, "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedAccountMember(uid: string, accountId: string, role: "owner" | "editor") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `accounts/${accountId}/members/${uid}`), {
      uid,
      role,
      email: `${uid}@test.com`,
      displayName: "Test",
      joinedAt: new Date(),
    });
  });
}

describe("Firestore Security Rules", () => {
  describe("users collection", () => {
    it("allows a user to read their own profile", async () => {
      const uid = "user1";
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${uid}`), { displayName: "Test" });
      });

      const db = testEnv.authenticatedContext(uid).firestore();
      await assertSucceeds(getDoc(doc(db, `users/${uid}`)));
    });

    it("denies a user from reading another user's profile", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users/user2"), { displayName: "Other" });
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(getDoc(doc(db, "users/user2")));
    });

    it("allows a user to create their own profile", async () => {
      const uid = "user1";
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertSucceeds(
        setDoc(doc(db, `users/${uid}`), { displayName: "Test", email: "test@test.com" })
      );
    });

    it("denies creating another user's profile", async () => {
      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(
        setDoc(doc(db, "users/user2"), { displayName: "Hack" })
      );
    });

    it("denies unauthenticated access", async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, "users/user1")));
    });

    it("allows admin to read any user", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users/user2"), { displayName: "Other" });
      });

      const db = testEnv.authenticatedContext("admin1", { role: "admin" }).firestore();
      await assertSucceeds(getDoc(doc(db, "users/user2")));
    });
  });

  describe("accounts collection", () => {
    it("allows account members to read account data", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `accounts/${accountId}`), { name: "Test Account" });
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertSucceeds(getDoc(doc(db, `accounts/${accountId}`)));
    });

    it("denies non-members from reading account data", async () => {
      const accountId = "acc1";
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `accounts/${accountId}`), { name: "Test Account" });
      });

      const db = testEnv.authenticatedContext("user2").firestore();
      await assertFails(getDoc(doc(db, `accounts/${accountId}`)));
    });

    it("denies client-side account creation (must go through Cloud Functions)", async () => {
      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(
        setDoc(doc(db, "accounts/newacc"), { name: "New" })
      );
    });
  });

  describe("apps collection", () => {
    it("allows account members to create apps", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertSucceeds(
        addDoc(collection(db, `accounts/${accountId}/apps`), {
          name: "Test App",
          slug: "test-app",
          status: "draft",
        })
      );
    });

    it("denies non-members from creating apps in an account", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");

      const db = testEnv.authenticatedContext("user2").firestore();
      await assertFails(
        addDoc(collection(db, `accounts/${accountId}/apps`), {
          name: "Hack App",
          slug: "hack",
          status: "draft",
        })
      );
    });

    it("allows editors to update apps", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "editor");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `accounts/${accountId}/apps/app1`), {
          name: "App",
          status: "draft",
        });
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertSucceeds(
        updateDoc(doc(db, `accounts/${accountId}/apps/app1`), { name: "Updated" })
      );
    });

    it("only allows owners to delete apps", async () => {
      const accountId = "acc1";
      await seedAccountMember("editor1", accountId, "editor");
      await seedAccountMember("owner1", accountId, "owner");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `accounts/${accountId}/apps/app1`), {
          name: "App",
          status: "draft",
        });
      });

      const editorDb = testEnv.authenticatedContext("editor1").firestore();
      await assertFails(deleteDoc(doc(editorDb, `accounts/${accountId}/apps/app1`)));

      const ownerDb = testEnv.authenticatedContext("owner1").firestore();
      await assertSucceeds(deleteDoc(doc(ownerDb, `accounts/${accountId}/apps/app1`)));
    });
  });

  describe("requests collection", () => {
    it("denies direct writes from clients (must go through Cloud Functions)", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(
        addDoc(collection(db, `accounts/${accountId}/apps/app1/requests`), {
          type: "deletion",
          email: "test@test.com",
        })
      );
    });

    it("allows members to read requests", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), `accounts/${accountId}/apps/app1/requests/req1`),
          { type: "deletion", email: "test@test.com", status: "new" }
        );
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertSucceeds(
        getDoc(doc(db, `accounts/${accountId}/apps/app1/requests/req1`))
      );
    });

    it("allows members to update request status", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), `accounts/${accountId}/apps/app1/requests/req1`),
          { type: "deletion", email: "test@test.com", status: "new" }
        );
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertSucceeds(
        updateDoc(doc(db, `accounts/${accountId}/apps/app1/requests/req1`), { status: "done" })
      );
    });
  });

  describe("slugs collection", () => {
    it("denies direct writes (must go through Cloud Functions/transactions)", async () => {
      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(
        setDoc(doc(db, "slugs/my-app"), { accountId: "acc1", appId: "app1" })
      );
    });

    it("allows authenticated users to read slugs", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "slugs/my-app"), { accountId: "acc1", appId: "app1" });
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertSucceeds(getDoc(doc(db, "slugs/my-app")));
    });
  });

  describe("cross-tenant isolation", () => {
    it("prevents user from accessing another account's apps", async () => {
      await seedAccountMember("user1", "acc1", "owner");
      await seedAccountMember("user2", "acc2", "owner");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "accounts/acc2/apps/app1"), {
          name: "Private App",
          status: "draft",
        });
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(getDoc(doc(db, "accounts/acc2/apps/app1")));
    });

    it("prevents user from updating another account's apps", async () => {
      await seedAccountMember("user1", "acc1", "owner");
      await seedAccountMember("user2", "acc2", "owner");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "accounts/acc2/apps/app1"), {
          name: "Private App",
          status: "draft",
        });
      });

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(
        updateDoc(doc(db, "accounts/acc2/apps/app1"), { name: "Hacked" })
      );
    });
  });

  describe("versions collection", () => {
    it("denies direct writes (must go through Cloud Functions)", async () => {
      const accountId = "acc1";
      await seedAccountMember("user1", accountId, "owner");

      const db = testEnv.authenticatedContext("user1").firestore();
      await assertFails(
        setDoc(doc(db, `accounts/${accountId}/apps/app1/versions/1`), {
          version: 1,
          snapshot: {},
        })
      );
    });
  });
});
