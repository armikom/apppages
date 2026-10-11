import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { AppListPage } from "./pages/AppListPage";
import { AppDetailPage } from "./pages/AppDetailPage";
import { CreateAppPage } from "./pages/CreateAppPage";
import { InboxPage } from "./pages/InboxPage";
import { SettingsPage } from "./pages/SettingsPage";
import { logPageView, createLogger } from "./lib/logger";

const log = createLogger("app");

function RouteLogger() {
  const location = useLocation();
  useEffect(() => {
    logPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    log.debug("Auth state loading, showing spinner");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }
  if (!user) {
    log.info("Unauthenticated access, redirecting to /login");
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <RouteLogger />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AppListPage />} />
          <Route path="apps/new" element={<CreateAppPage />} />
          <Route path="apps/:appId" element={<AppDetailPage />} />
          <Route path="apps/:appId/inbox" element={<InboxPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}
