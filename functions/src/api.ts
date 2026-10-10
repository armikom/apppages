import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { publicRequestSchema } from "@apppages/shared";
import crypto from "crypto";

let _db: Firestore;
function db() { return _db ??= getFirestore(); }

/** Simple in-memory rate limiter (per function instance) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per window per key

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(req: { ip?: string; get: (h: string) => string | undefined }): string {
  return req.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
}

/** Parse URL-encoded form body */
function parseFormBody(body: unknown): Record<string, string> {
  if (typeof body === "object" && body !== null) return body as Record<string, string>;
  if (typeof body === "string") {
    const params = new URLSearchParams(body);
    const result: Record<string, string> = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }
  return {};
}

export const api = onRequest(
  { region: "us-central1", memory: "256MiB" },
  async (req, res) => {
    // CORS for API
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Route: POST /api/request/:slug
    const match = req.path.match(/^\/api\/request\/([a-z0-9-]+)$/);
    if (!match || req.method !== "POST") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const slug = match[1];
    const clientIp = getClientIp(req);

    // Rate limit by IP + slug
    const rateLimitKey = `${clientIp}:${slug}`;
    if (isRateLimited(rateLimitKey)) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    // Look up app
    const slugDoc = await db().doc(`slugs/${slug}`).get();
    if (!slugDoc.exists) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const { accountId, appId } = slugDoc.data() as { accountId: string; appId: string };
    const appDoc = await db().doc(`accounts/${accountId}/apps/${appId}`).get();
    if (!appDoc.exists) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const appData = appDoc.data()!;
    if (appData.status !== "published") {
      res.status(404).json({ error: "App not found" });
      return;
    }

    // Parse and validate input
    const body = parseFormBody(req.body);
    const parsed = publicRequestSchema.safeParse(body);
    if (!parsed.success) {
      // If form submission, redirect back with error
      const isFormPost = req.get("content-type")?.includes("application/x-www-form-urlencoded");
      if (isFormPost) {
        res.redirect(303, `/p/${slug}/support?error=validation`);
        return;
      }
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { email, username, reason, message, type } = parsed.data;

    // Check if deletion page is enabled for data_deletion
    if (type === "data_deletion" && !appData.dataDeletionEnabled) {
      res.status(400).json({ error: "Data deletion is not enabled for this app" });
      return;
    }

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString("hex");

    // Create request doc
    const requestRef = db().collection(`accounts/${accountId}/apps/${appId}/requests`).doc();
    await requestRef.set({
      type,
      status: "pending_confirmation",
      email,
      username: username || null,
      reason: reason || null,
      message: message || null,
      confirmationToken,
      confirmedAt: null,
      notes: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      resolvedAt: null,
      appId,
      accountId,
    });

    // TODO: Send confirmation email via Trigger Email extension or pluggable mail sender
    // For now, log the confirmation URL
    const confirmUrl = `/api/confirm/${requestRef.id}?token=${confirmationToken}`;
    console.log(`Confirmation URL for request ${requestRef.id}: ${confirmUrl}`);

    // Redirect or respond
    const isFormPost = req.get("content-type")?.includes("application/x-www-form-urlencoded");
    if (isFormPost) {
      const redirectPage = type === "support" ? "support" : "delete-account";
      res.redirect(303, `/p/${slug}/${redirectPage}?success=true`);
      return;
    }

    res.status(201).json({
      message: "Request submitted. Please check your email to confirm.",
      requestId: requestRef.id,
    });
  }
);
