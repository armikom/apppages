import { useParams, Link } from "react-router-dom";
import { useApps } from "../hooks/useApps";
import { ExternalLink, Copy, Inbox, Trash2, Upload, Eye } from "lucide-react";
import { useState } from "react";
import { createLogger } from "../lib/logger";

const log = createLogger("AppDetailPage");

export function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const { apps, publishApp, deleteApp, loading } = useApps();
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const app = apps.find((a) => a.id === appId);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!app) {
    log.warn("App not found", { appId });
    return <div className="text-center py-12 text-gray-500">App not found</div>;
  }

  log.debug("Rendering app detail", { appId, slug: app.slug, status: app.status });

  const baseUrl = window.location.origin;
  const publicBase = `${baseUrl}/p/${app.slug}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const pages = [
    { label: "Landing Page", path: "", url: publicBase },
    { label: "Privacy Policy", path: "/privacy", url: `${publicBase}/privacy` },
    { label: "Terms of Use", path: "/terms", url: `${publicBase}/terms` },
    { label: "Support", path: "/support", url: `${publicBase}/support` },
    { label: "Account Deletion", path: "/delete-account", url: `${publicBase}/delete-account` },
    ...(app.dataDeletionEnabled
      ? [{ label: "Data Deletion", path: "/delete-data", url: `${publicBase}/delete-data` }]
      : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {app.icon ? (
            <img src={app.icon} alt="" className="h-16 w-16 rounded-2xl" />
          ) : (
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: app.primaryColor }}
            >
              {app.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
            <p className="text-sm text-gray-500">{app.shortDescription}</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                app.status === "published"
                  ? "bg-green-100 text-green-800"
                  : app.status === "disabled"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {app.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/apps/${app.id}/inbox`}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Inbox className="h-4 w-4" /> Inbox
          </Link>
          {app.status === "draft" && (
            <button
              onClick={() => {
                log.info("Publish button clicked", { appId: app.id, slug: app.slug });
                publishApp(app.id);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Upload className="h-4 w-4" /> Publish
            </button>
          )}
        </div>
      </div>

      {/* Store Links Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Store Links — Copy & Paste</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* App Store Connect */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>🍎</span> App Store Connect
            </h3>
            <div className="space-y-2">
              {[
                { label: "Privacy Policy URL", url: `${publicBase}/privacy` },
                { label: "Support URL", url: `${publicBase}/support` },
                { label: "Marketing URL", url: publicBase },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <p className="text-sm text-gray-700 font-mono">{item.url}</p>
                  </div>
                  <button onClick={() => copy(item.url)} className="text-gray-400 hover:text-gray-600 p-1">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Google Play Console */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>🤖</span> Google Play Console
            </h3>
            <div className="space-y-2">
              {[
                { label: "Privacy policy", url: `${publicBase}/privacy` },
                { label: "Account deletion URL (Data safety)", url: `${publicBase}/delete-account` },
                { label: "Support email", url: app.publisher.supportEmail },
                { label: "Website", url: app.publisher.website || publicBase },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <p className="text-sm text-gray-700 font-mono">{item.url}</p>
                  </div>
                  <button onClick={() => copy(item.url)} className="text-gray-400 hover:text-gray-600 p-1">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All Public Pages */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Public Pages</h2>
        <div className="space-y-2">
          {pages.map((page) => (
            <div key={page.path} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{page.label}</p>
                <code className="text-xs text-gray-400">{page.url}</code>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copy(page.url)} className="p-1 text-gray-400 hover:text-gray-600" title="Copy URL">
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowPreview(showPreview === page.path ? null : page.path)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {app.status === "published" && (
                  <a href={page.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-600" title="Open">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        {showPreview && (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden" style={{ height: 500 }}>
            <iframe
              src={`${publicBase}${showPreview}`}
              className="w-full h-full"
              title="Page Preview"
            />
          </div>
        )}
      </div>

      {/* Data Safety Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Data Safety Summary</h2>
        <p className="text-xs text-yellow-600 mb-4">
          ⚠️ Verify before submitting to stores. This is not legal advice.
        </p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Google Play Data Safety</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Data collected: {app.dataPractices.dataTypesCollected.length} types</li>
              <li>• Third-party SDKs: {app.dataPractices.thirdPartySdks.length}</li>
              <li>• Account deletion: {app.deletionInfo.webFormEnabled ? "Yes (web + in-app)" : "In-app only"}</li>
              <li>• Ads: {app.dataPractices.adsEnabled ? "Yes" : "No"}</li>
              <li>• Encryption: All data encrypted in transit</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Apple App Privacy</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Data linked to identity: {app.dataPractices.accountCreation ? "Yes" : "No"}</li>
              <li>• Data used for tracking: {app.dataPractices.adsEnabled ? "Possible (ads)" : "No"}</li>
              <li>• Third-party SDKs: {app.dataPractices.thirdPartySdks.length}</li>
              <li>• Children: {app.dataPractices.childrenTarget ? "Yes (COPPA)" : "No"}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-4">Danger Zone</h2>
        <button
          onClick={async () => {
            if (!confirm("Are you sure you want to delete this app? This cannot be undone.")) return;
            setDeleting(true);
            try {
              await deleteApp(app.id);
              window.location.href = "/";
            } catch (e) {
              setDeleting(false);
            }
          }}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting..." : "Delete App"}
        </button>
      </div>
    </div>
  );
}
