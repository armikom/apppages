import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createLogger } from "../lib/logger";

const log = createLogger("LoginPage");

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    log.debug("Login page loading auth state");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (user) {
    log.info("Already authenticated, redirecting to dashboard", { uid: user.uid });
    return <Navigate to="/" />;
  }

  log.debug("Rendering login page");

  async function handleSignIn() {
    log.info("User clicked Google sign-in button");
    try {
      await signInWithGoogle();
    } catch (err) {
      log.error("Sign-in failed from LoginPage", err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">AppPages</h1>
          <p className="text-gray-500">
            Privacy policies, terms, support pages and more for your mobile apps.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          {/* Apple sign-in — enable later when Apple Services ID is configured */}
        </div>

        <p className="text-xs text-center text-gray-400 mt-8">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
