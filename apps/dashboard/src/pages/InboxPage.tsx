import { useParams, Link } from "react-router-dom";
import { useRequests } from "../hooks/useRequests";
import { useApps } from "../hooks/useApps";
import { ArrowLeft, Mail, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { RequestStatus } from "@apppages/shared";

const STATUS_ICONS: Record<string, typeof Mail> = {
  pending_confirmation: Clock,
  new: Mail,
  in_progress: Clock,
  done: CheckCircle,
  rejected: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending_confirmation: "bg-gray-100 text-gray-700",
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function InboxPage() {
  const { appId } = useParams<{ appId: string }>();
  const { apps } = useApps();
  const { requests, loading, updateRequestStatus } = useRequests(appId);
  const app = apps.find((a) => a.id === appId);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/apps/${appId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Inbox {app ? `— ${app.name}` : ""}
        </h1>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const Icon = STATUS_ICONS[req.status] || Mail;
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {req.type.replace(/_/g, " ")} request
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                          {req.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        From: {req.email}
                        {req.username && ` (${req.username})`}
                      </p>
                      {req.reason && (
                        <p className="text-sm text-gray-500 mt-1">Reason: {req.reason}</p>
                      )}
                      {req.message && (
                        <p className="text-sm text-gray-500 mt-1">Message: {req.message}</p>
                      )}
                      {req.notes && (
                        <p className="text-xs text-gray-400 mt-1">Notes: {req.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status !== "done" && req.status !== "rejected" && (
                    <div className="flex items-center gap-1">
                      {req.status === "new" && (
                        <button
                          onClick={() => updateRequestStatus(appId!, req.id, "in_progress")}
                          className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                        >
                          In Progress
                        </button>
                      )}
                      <button
                        onClick={() => updateRequestStatus(appId!, req.id, "done")}
                        className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => updateRequestStatus(appId!, req.id, "rejected")}
                        className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export CSV */}
      {requests.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => {
              const headers = "ID,Type,Status,Email,Username,Reason,Message,Created At\n";
              const rows = requests
                .map((r) =>
                  [r.id, r.type, r.status, r.email, r.username || "", r.reason || "", r.message || "", String(r.createdAt)]
                    .map((v) => `"${v}"`)
                    .join(",")
                )
                .join("\n");
              const blob = new Blob([headers + rows], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `requests-${appId}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}
