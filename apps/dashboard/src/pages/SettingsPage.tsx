import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, auth } from "../lib/firebase";

export function SettingsPage() {
  const { user, profile } = useAuth();
  const [deleting, setDeleting] = useState(false);

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
      // Note: In production, cascading delete should be handled by a Cloud Function.
      // This is a simplified version for the dashboard.
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
    } catch (e: any) {
      alert("Failed to delete account: " + e.message);
      setDeleting(false);
    }
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
              <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full" />
            )}
            <div>
              <p className="font-medium text-gray-900">{profile?.displayName ?? user?.displayName}</p>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-gray-400 text-xs mt-1">
                Plan: <span className="font-medium capitalize">{profile?.plan ?? "free"}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Account ID: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{profile?.defaultAccountId}</code></p>
          <p>Role: <span className="capitalize">{profile?.role ?? "user"}</span></p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Delete Account</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your AppPages account, all apps, and associated data. This action
          cannot be undone.
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
