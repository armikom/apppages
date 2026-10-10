import { Link } from "react-router-dom";
import { useApps } from "../hooks/useApps";
import { Plus, Copy, ExternalLink, Globe, Inbox } from "lucide-react";

export function AppListPage() {
  const { apps, loading } = useApps();

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading apps...</div>;
  }

  const baseUrl = window.location.origin;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Apps</h1>
        <Link
          to="/apps/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create App
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">No apps yet</h2>
          <p className="text-gray-500 mb-6">
            Create your first app to generate privacy policies, terms, and support pages.
          </p>
          <Link
            to="/apps/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create App
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {app.icon ? (
                    <img src={app.icon} alt="" className="h-12 w-12 rounded-xl" />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: app.primaryColor }}
                    >
                      {app.name[0]}
                    </div>
                  )}
                  <div>
                    <Link
                      to={`/apps/${app.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {app.name}
                    </Link>
                    <p className="text-sm text-gray-500">{app.shortDescription}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          app.status === "published"
                            ? "bg-green-100 text-green-800"
                            : app.status === "disabled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {app.status}
                      </span>
                      <code className="text-xs text-gray-400">/{app.slug}</code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/apps/${app.id}/inbox`}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                    title="Inbox"
                  >
                    <Inbox className="h-5 w-5" />
                  </Link>
                  {app.status === "published" && (
                    <a
                      href={`/p/${app.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                      title="View public page"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Quick copy links */}
              {app.status === "published" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Quick copy links:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Landing", path: "" },
                      { label: "Privacy", path: "/privacy" },
                      { label: "Terms", path: "/terms" },
                      { label: "Support", path: "/support" },
                      { label: "Delete Account", path: "/delete-account" },
                    ].map((link) => (
                      <button
                        key={link.path}
                        onClick={() =>
                          copyToClipboard(`${baseUrl}/p/${app.slug}${link.path}`)
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100"
                      >
                        <Copy className="h-3 w-3" />
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
