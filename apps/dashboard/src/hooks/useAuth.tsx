import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { createLogger, setLoggerUserContext } from "../lib/logger";
import type { UserProfile } from "@apppages/shared";

const log = createLogger("auth");

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const googleProvider = new GoogleAuthProvider();

function isMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) && /WebKit/.test(navigator.userAgent);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    log.info("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        log.info("User authenticated", {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? undefined,
          provider: firebaseUser.providerData[0]?.providerId,
        });
        setLoggerUserContext(firebaseUser.uid);
        try {
          const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setProfile(profileData);
            setLoggerUserContext(firebaseUser.uid, profileData.defaultAccountId);
            log.info("User profile loaded", {
              accountId: profileData.defaultAccountId,
              plan: profileData.plan,
              role: profileData.role,
            });
          } else {
            log.warn("User profile doc not found — may be pending creation by trigger", {
              uid: firebaseUser.uid,
            });
          }
        } catch (err) {
          log.error("Failed to load user profile", err, { uid: firebaseUser.uid });
        }
      } else {
        log.info("User signed out or no session");
        setProfile(null);
        setLoggerUserContext(undefined, undefined);
      }
      setLoading(false);
    });

    getRedirectResult(auth)
      .then((result) => {
        if (result) log.info("Redirect sign-in completed", { uid: result.user.uid });
      })
      .catch((err) => {
        log.error("Redirect sign-in failed", err);
      });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const isMobile = isMobileSafari();
    log.info("Google sign-in initiated", { method: isMobile ? "redirect" : "popup" });
    try {
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
      log.info("Google sign-in successful");
    } catch (error: any) {
      if (error.code === "auth/popup-blocked") {
        log.warn("Popup blocked, falling back to redirect");
        await signInWithRedirect(auth, googleProvider);
      } else {
        log.error("Google sign-in failed", error, { code: error.code });
        throw error;
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    log.info("Sign-out initiated");
    await firebaseSignOut(auth);
    setLoggerUserContext(undefined, undefined);
    log.info("Sign-out completed");
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
