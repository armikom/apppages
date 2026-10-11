#!/usr/bin/env node

/**
 * AppPages MCP Server
 *
 * Provides AI agents with tools to manage AppPages apps:
 * list, create, update, publish, delete apps; manage requests;
 * get public URLs and store links.
 *
 * Transport: stdio (JSON-RPC over stdin/stdout)
 * Auth: Firebase Admin SDK with service account or ADC
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = process.env.FIREBASE_PROJECT_ID || "armikom-app-pages";

if (serviceAccountPath) {
  const sa = (await import(serviceAccountPath, { with: { type: "json" } })).default;
  initializeApp({ credential: cert(sa as ServiceAccount), projectId });
} else {
  initializeApp({ projectId });
}

const db = getFirestore();

// Default account — for single-user usage. Agents can override with accountId param.
const DEFAULT_ACCOUNT_ID = process.env.APPPAGES_ACCOUNT_ID || "";

// Base URL for public pages
const BASE_URL = process.env.APPPAGES_BASE_URL || "https://armikom-app-pages.web.app";

// ─── Server Setup ───

const server = new McpServer({
  name: "apppages",
  version: "0.1.0",
});

// ─── Helper functions ───

async function resolveAccountId(accountId?: string): Promise<string> {
  const id = accountId || DEFAULT_ACCOUNT_ID;
  if (!id) throw new Error("accountId is required. Set APPPAGES_ACCOUNT_ID env var or pass accountId parameter.");
  return id;
}

async function getApps(accountId: string) {
  const snap = await db.collection(`accounts/${accountId}/apps`).orderBy("updatedAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getApp(accountId: string, appId: string) {
  const doc = await db.doc(`accounts/${accountId}/apps/${appId}`).get();
  if (!doc.exists) throw new Error(`App ${appId} not found`);
  return { id: doc.id, ...doc.data() };
}

function formatDate(ts: any): string {
  if (!ts) return "N/A";
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return String(ts);
}

// ─── Tools ───

server.tool(
  "list_apps",
  "List all apps in the account with their status, slug, and key info",
  { accountId: z.string().optional().describe("Account ID (defaults to APPPAGES_ACCOUNT_ID env var)") },
  async ({ accountId }) => {
    const acctId = await resolveAccountId(accountId);
    const apps = await getApps(acctId);

    if (apps.length === 0) {
      return { content: [{ type: "text", text: "No apps found in this account." }] };
    }

    const lines = apps.map((a: any) =>
      `• ${a.name} (/${a.slug}) — status: ${a.status}, id: ${a.id}, updated: ${formatDate(a.updatedAt)}`
    );

    return {
      content: [{ type: "text", text: `Found ${apps.length} app(s):\n\n${lines.join("\n")}` }],
    };
  }
);

server.tool(
  "get_app",
  "Get full details of an app including publisher, platforms, data practices, support info, and deletion info",
  {
    appId: z.string().describe("The app document ID"),
    accountId: z.string().optional().describe("Account ID"),
  },
  async ({ appId, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    const app = await getApp(acctId, appId);
    return {
      content: [{ type: "text", text: JSON.stringify(app, null, 2) }],
    };
  }
);

server.tool(
  "create_app",
  "Create a new app with basic info. Returns the new app ID. The app starts as a draft.",
  {
    name: z.string().describe("App display name"),
    slug: z.string().describe("URL slug (lowercase, hyphens, 3-60 chars, globally unique)"),
    shortDescription: z.string().describe("Short description of the app"),
    primaryColor: z.string().default("#3b82f6").describe("Hex color code (e.g. #3b82f6)"),
    defaultLanguage: z.enum(["en", "tr"]).default("en"),
    packageName: z.string().optional().describe("Android package name (e.g. com.example.app)"),
    bundleId: z.string().optional().describe("iOS bundle ID"),
    publisherName: z.string().describe("Legal entity name of the publisher/developer"),
    publisherType: z.enum(["individual", "company"]).default("individual"),
    country: z.string().describe("Publisher country"),
    contactEmail: z.string().email().describe("Contact email"),
    supportEmail: z.string().email().describe("Support email"),
    accountId: z.string().optional(),
  },
  async (params) => {
    const acctId = await resolveAccountId(params.accountId);

    // Check slug availability
    const slugDoc = await db.doc(`slugs/${params.slug}`).get();
    if (slugDoc.exists) {
      return { content: [{ type: "text", text: `Error: Slug "${params.slug}" is already taken.` }], isError: true };
    }

    const appRef = db.collection(`accounts/${acctId}/apps`).doc();
    const appData = {
      name: params.name,
      slug: params.slug,
      shortDescription: params.shortDescription,
      primaryColor: params.primaryColor,
      icon: "",
      status: "draft",
      defaultLanguage: params.defaultLanguage,
      additionalLanguages: [],
      platforms: {
        ...(params.packageName ? { android: { packageName: params.packageName, playStoreUrl: "" } } : {}),
        ...(params.bundleId ? { ios: { bundleId: params.bundleId, appStoreUrl: "", appStoreId: "" } } : {}),
      },
      publisher: {
        legalEntityName: params.publisherName,
        type: params.publisherType,
        country: params.country,
        contactEmail: params.contactEmail,
        supportEmail: params.supportEmail,
        address: "",
        phone: "",
        website: "",
      },
      dataPractices: {
        dataTypesCollected: [],
        thirdPartySdks: [],
        accountCreation: false,
        childrenTarget: false,
        adsEnabled: false,
        inAppPurchases: false,
        gdprEnabled: false,
        kvkkEnabled: false,
        ccpaEnabled: false,
      },
      supportInfo: {
        faqItems: [],
        contactEmail: params.supportEmail,
        contactMethods: ["email"],
        supportFormEnabled: true,
      },
      deletionInfo: {
        stepsToDelete: ["Open the app", "Go to Settings", "Tap Delete Account", "Confirm deletion"],
        dataDeleted: ["User profile", "App data"],
        dataRetained: [],
        webFormEnabled: true,
      },
      dataDeletionEnabled: false,
      useAppleStandardEula: false,
      customSections: [],
      accountId: acctId,
      publishedVersion: null,
      publishedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Transaction: reserve slug + create app
    await db.runTransaction(async (tx) => {
      const slugRef = db.doc(`slugs/${params.slug}`);
      const slugSnap = await tx.get(slugRef);
      if (slugSnap.exists) throw new Error(`Slug "${params.slug}" is already taken`);

      tx.set(slugRef, { accountId: acctId, appId: appRef.id, createdAt: FieldValue.serverTimestamp() });
      tx.set(appRef, appData);
    });

    return {
      content: [{ type: "text", text: `App created successfully!\n\nID: ${appRef.id}\nSlug: /${params.slug}\nStatus: draft\n\nUse publish_app to make it live.` }],
    };
  }
);

server.tool(
  "update_app",
  "Update app fields. Pass only the fields you want to change as a JSON object.",
  {
    appId: z.string().describe("The app document ID"),
    updates: z.record(z.any()).describe("JSON object of fields to update (e.g. {\"name\": \"New Name\", \"shortDescription\": \"...\"}). Supports nested paths via dot notation."),
    accountId: z.string().optional(),
  },
  async ({ appId, updates, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    await db.doc(`accounts/${acctId}/apps/${appId}`).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { content: [{ type: "text", text: `App ${appId} updated successfully.` }] };
  }
);

server.tool(
  "publish_app",
  "Publish an app (change status to 'published'). This makes all public pages live and creates a version snapshot.",
  {
    appId: z.string().describe("The app document ID"),
    accountId: z.string().optional(),
  },
  async ({ appId, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    await db.doc(`accounts/${acctId}/apps/${appId}`).update({
      status: "published",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { content: [{ type: "text", text: `App ${appId} published! The onAppWrite trigger will create a version snapshot.\n\nPublic pages are now live.` }] };
  }
);

server.tool(
  "delete_app",
  "Delete an app and release its slug. This is irreversible.",
  {
    appId: z.string().describe("The app document ID"),
    accountId: z.string().optional(),
  },
  async ({ appId, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    const appDoc = await db.doc(`accounts/${acctId}/apps/${appId}`).get();
    if (!appDoc.exists) {
      return { content: [{ type: "text", text: `App ${appId} not found.` }], isError: true };
    }

    const slug = appDoc.data()?.slug;
    await db.doc(`accounts/${acctId}/apps/${appId}`).delete();
    if (slug) {
      await db.doc(`slugs/${slug}`).delete();
    }
    return { content: [{ type: "text", text: `App ${appId} (/${slug}) deleted and slug released.` }] };
  }
);

server.tool(
  "list_requests",
  "List deletion and support requests for an app, with status and requester info",
  {
    appId: z.string().describe("The app document ID"),
    status: z.enum(["pending_confirmation", "new", "in_progress", "done", "rejected"]).optional().describe("Filter by status"),
    accountId: z.string().optional(),
  },
  async ({ appId, status, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    let query = db.collection(`accounts/${acctId}/apps/${appId}/requests`).orderBy("createdAt", "desc");

    const snap = await query.get();
    let requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (status) {
      requests = requests.filter((r: any) => r.status === status);
    }

    if (requests.length === 0) {
      return { content: [{ type: "text", text: "No requests found." }] };
    }

    const lines = requests.map((r: any) =>
      `• [${r.status}] ${r.type} from ${r.email}${r.username ? ` (${r.username})` : ""} — ${formatDate(r.createdAt)} — id: ${r.id}`
    );

    return {
      content: [{ type: "text", text: `Found ${requests.length} request(s):\n\n${lines.join("\n")}` }],
    };
  }
);

server.tool(
  "update_request",
  "Update the status of a deletion or support request",
  {
    appId: z.string().describe("The app document ID"),
    requestId: z.string().describe("The request document ID"),
    status: z.enum(["new", "in_progress", "done", "rejected"]).describe("New status"),
    notes: z.string().optional().describe("Internal notes"),
    accountId: z.string().optional(),
  },
  async ({ appId, requestId, status, notes, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    const updates: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (notes !== undefined) updates.notes = notes;
    if (status === "done" || status === "rejected") {
      updates.resolvedAt = FieldValue.serverTimestamp();
    }
    await db.doc(`accounts/${acctId}/apps/${appId}/requests/${requestId}`).update(updates);
    return { content: [{ type: "text", text: `Request ${requestId} updated to status: ${status}` }] };
  }
);

server.tool(
  "get_public_urls",
  "Get all public page URLs for an app",
  {
    appId: z.string().describe("The app document ID"),
    accountId: z.string().optional(),
  },
  async ({ appId, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    const app: any = await getApp(acctId, appId);

    const urls = [
      `Landing:         ${BASE_URL}/p/${app.slug}`,
      `Privacy Policy:  ${BASE_URL}/p/${app.slug}/privacy`,
      `Terms of Use:    ${BASE_URL}/p/${app.slug}/terms`,
      `Support:         ${BASE_URL}/p/${app.slug}/support`,
      `Delete Account:  ${BASE_URL}/p/${app.slug}/delete-account`,
    ];
    if (app.dataDeletionEnabled) {
      urls.push(`Delete Data:     ${BASE_URL}/p/${app.slug}/delete-data`);
    }
    urls.push(`Version History: ${BASE_URL}/p/${app.slug}/privacy/history`);

    return {
      content: [{
        type: "text",
        text: `Public URLs for "${app.name}" (status: ${app.status}):\n\n${urls.join("\n")}`,
      }],
    };
  }
);

server.tool(
  "get_store_links",
  "Get the exact URLs to paste into App Store Connect and Google Play Console for an app",
  {
    appId: z.string().describe("The app document ID"),
    accountId: z.string().optional(),
  },
  async ({ appId, accountId }) => {
    const acctId = await resolveAccountId(accountId);
    const app: any = await getApp(acctId, appId);

    const lines: string[] = [];

    lines.push("═══ App Store Connect ═══");
    lines.push(`Privacy Policy URL:  ${BASE_URL}/p/${app.slug}/privacy`);
    lines.push(`Support URL:         ${BASE_URL}/p/${app.slug}/support`);
    lines.push(`Marketing URL:       ${BASE_URL}/p/${app.slug}`);
    lines.push("");
    lines.push("═══ Google Play Console ═══");
    lines.push(`Privacy policy:              ${BASE_URL}/p/${app.slug}/privacy`);
    lines.push(`Account deletion URL:        ${BASE_URL}/p/${app.slug}/delete-account`);
    if (app.dataDeletionEnabled) {
      lines.push(`Data deletion URL:           ${BASE_URL}/p/${app.slug}/delete-data`);
    }
    lines.push(`Support email:               ${app.publisher?.supportEmail || "N/A"}`);
    lines.push(`Website:                     ${app.publisher?.website || BASE_URL + "/p/" + app.slug}`);

    return {
      content: [{ type: "text", text: `Store links for "${app.name}":\n\n${lines.join("\n")}` }],
    };
  }
);

// ─── Start ───

const transport = new StdioServerTransport();
await server.connect(transport);
