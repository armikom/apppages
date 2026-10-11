import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useCallback } from "react";
import {
  deleteDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, auth } from "../lib/firebase";

// ─── API Key helpers ───

const API_KEY_PREFIX = "apk_";

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return API_KEY_PREFIX + hex;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ApiKeyDoc {
  id: string;
  prefix: string;
  label: string;
  active: boolean;
  scopes: string[];
  createdAt: any;
  lastUsedAt: any;
}

// ─── Component ───

export function SettingsPage() {
  const { user, profile } = useAuth();
  const [deleting, setDeleting] = useState(false);

  // API Key state
  const [keys, setKeys] = useState<ApiKeyDoc[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const accountId = profile?.defaultAccountId;

  // Load API keys
  const loadKeys = useCallback(async () => {
    if (!accountId) return;
    setLoadingKeys(true);
    try {
      const q = query(
        collection(db, "apiKeys"),
        where("accountId", "==", accountId)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ApiKeyDoc[];
      loaded.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return 0;
      });
      setKeys(loaded);
    } catch (e) {
      console.error("Failed to load API keys:", e);
    } finally {
      setLoadingKeys(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // Create API key
  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !accountId || !newKeyLabel.trim()) return;

    setCreatingKey(true);
    try {
      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);

      await setDoc(doc(db, "apiKeys", keyHash), {
        prefix: rawKey.substring(0, 12) + "...",
        accountId,
        uid: user.uid,
        label: newKeyLabel.trim(),
        active: true,
        scopes: [],
        createdAt: serverTimestamp(),
        lastUsedAt: null,
      });

      setNewlyCreatedKey(rawKey);
      setNewKeyLabel("");
      await loadKeys();
    } catch (e: any) {
      alert("Failed to create API key: " + e.message);
    } finally {
      setCreatingKey(false);
    }
  }

  // Copy key to clipboard
  async function handleCopy() {
    if (!newlyCreatedKey) return;
    await navigator.clipboard.writeText(newlyCreatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Revoke key
  async function handleRevoke(keyId: string, label: string) {
    if (
      !confirm(
        `Revoke API key "${label}"? Any agent or integration using this key will stop working. This cannot be undone.`
      )
    )
      return;

    setRevokingId(keyId);
    try {
      await updateDoc(doc(db, "apiKeys", keyId), {
        active: false,
        revokedAt: serverTimestamp(),
      });
      await loadKeys();
    } catch (e: any) {
      alert("Failed to revoke key: " + e.message);
    } finally {
      setRevokingId(null);
    }
  }

  // Delete account
  async function handleDeleteAccount() {
    if (!user || !profile) return;
    if (
      !confirm(
        "Are you sure you want to delete your AppPages account? This will delete all your apps and data. This cannot be undone."
      )
    )
      return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
    } catch (e: any) {
      alert("Failed to delete account: " + e.message);
      setDeleting(false);
    }
  }

  function formatDate(ts: any): string {
    if (!ts) return "Never";
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    return String(ts);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-4">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="h-16 w-16 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {profile?.displayName ?? user?.displayName}
              </p>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-gray-400 text-xs mt-1">
                Plan:{" "}
                <span className="font-medium capitalize">
                  {profile?.plan ?? "free"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Account ID:{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
              {profile?.defaultAccountId}
            </code>
          </p>
          <p>
            Role:{" "}
            <span className="capitalize">{profile?.role ?? "user"}</span>
          </p>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">API Keys</h2>
            <p className="text-sm text-gray-500 mt-1">
              Use API keys to authenticate MCP agents and integrations.
            </p>
          </div>
        </div>

        {/* Newly created key banner */}
        {newlyCreatedKey && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  API key created! Copy it now — it won't be shown again.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs bg-green-100 text-green-900 px-2 py-1.5 rounded font-mono break-all select-all">
                    {newlyCreatedKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-medium"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  Set as <code className="font-mono">APPPAGES_API_KEY</code> in
                  your MCP server config.
                </p>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="text-green-600 hover:text-green-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Create key form */}
        <form onSubmit={handleCreateKey} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            placeholder="Key label (e.g. Cursor Agent, CI Pipeline)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            maxLength={100}
            required
          />
          <button
            type="submit"
            disabled={creatingKey || !newKeyLabel.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {creatingKey ? "Creating..." : "Create Key"}
          </button>
        </form>

        {/* Keys list */}
        {loadingKeys ? (
          <p className="text-sm text-gray-400">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-400">
            No API keys yet. Create one to get started.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`py-3 flex items-center justify-between gap-4 ${!k.active ? "opacity-50" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">
                      {k.prefix}
                    </code>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {k.label}
                    </span>
                    {k.active ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Created: {formatDate(k.createdAt)}
                    {k.lastUsedAt && (
                      <> · Last used: {formatDate(k.lastUsedAt)}</>
                    )}
                  </div>
                </div>
                {k.active && (
                  <button
                    onClick={() => handleRevoke(k.id, k.label)}
                    disabled={revokingId === k.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
                  >
                    {revokingId === k.id ? "Revoking..." : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">
          Delete Account
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your AppPages account, all apps, and associated
          data. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete My Account"}
        </button>
      </div>
    </div>
  );
}
