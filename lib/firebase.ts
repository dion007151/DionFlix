import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signInWithCredential, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

// HARDCODED Firebase authDomain — never use the Vercel domain here
const firebaseConfig = {
  apiKey: "AIzaSyAoU88XYH22-NdFXaB3faLCezdAZh9B370",
  authDomain: "dionflix.firebaseapp.com",
  projectId: "dionflix",
  storageBucket: "dionflix.firebasestorage.app",
  messagingSenderId: "98243771281",
  appId: "1:98243771281:web:1c3036beaa496d688d7830"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

// Firebase Hosting relay URL — this domain is ALWAYS trusted by Firebase
const RELAY_URL = "https://dionflix.firebaseapp.com/auth-relay.html";

/**
 * Result type returned by both popup and relay sign-in methods
 */
export type AuthResult = {
  user: FirebaseUser;
  token: string | null;
  provider: "google" | "facebook" | "email";
} | null;

/**
 * Sign in via relay popup (for production/Vercel).
 * Opens a popup to dionflix.firebaseapp.com which handles the OAuth flow
 * on the trusted Firebase domain, then relays the credential back via postMessage.
 */
function signInWithRelay(provider: "google" | "facebook", popup: Window): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    const origin = window.location.origin;
    const url = `${RELAY_URL}?provider=${provider}&origin=${encodeURIComponent(origin)}&v=2`;

    // Navigate the pre-opened popup to the relay URL
    popup.location.href = url;

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    let resolved = false;

    // Listen for the result from the relay page
    const handler = async (event: MessageEvent) => {
      // Accept from any origin since the relay is on a different domain
      if (!event.data || event.data.type !== "DIONFLIX_AUTH_RESULT") return;

      window.removeEventListener("message", handler);
      resolved = true;

      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }

      if (event.data.success && event.data.user) {
        const relayUser = event.data.user;

        try {
          // Reconstruct Firebase credential from the relay tokens
          let credential;
          if (provider === "google" && relayUser.idToken) {
            credential = GoogleAuthProvider.credential(relayUser.idToken, relayUser.accessToken);
          } else if (provider === "facebook" && relayUser.accessToken) {
            credential = FacebookAuthProvider.credential(relayUser.accessToken);
          }

          if (credential) {
            // Sign in locally with the credential
            const result = await signInWithCredential(auth, credential);
            resolve({
              user: result.user,
              token: relayUser.accessToken || null,
              provider: provider
            });
          } else {
            // Fallback: return the relay user data directly
            // The relay page already signed in on Firebase, so the auth state
            // should propagate via onAuthStateChanged
            resolve({
              user: auth.currentUser!,
              token: relayUser.accessToken || null,
              provider: provider
            });
          }
        } catch (err) {
          reject(err);
        }
      }
    };

    window.addEventListener("message", handler);

    // Check if popup was closed without completing
    const checkClosed = setInterval(() => {
      if (popup.closed && !resolved) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handler);
        reject(new Error("Authentication was cancelled."));
      }
    }, 500);
  });
}

/**
 * Sign in with Google — uses direct popup on localhost, relay on production.
 */
export async function signInWithGoogle(popup?: Window | null): Promise<AuthResult> {
  if (isLocalhost) {
    // Close pre-opened popup if any — Firebase opens its own
    if (popup) popup.close();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      return { user: result.user, token: credential?.accessToken || null, provider: "google" };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") return null;
      throw err;
    }
  } else {
    if (!popup) throw new Error("Popup required for production auth");
    return signInWithRelay("google", popup);
  }
}

/**
 * Sign in with Facebook — uses direct popup on localhost, relay on production.
 */
export async function signInWithFacebook(popup?: Window | null): Promise<AuthResult> {
  if (isLocalhost) {
    if (popup) popup.close();
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const credential = FacebookAuthProvider.credentialFromResult(result);
      return { user: result.user, token: credential?.accessToken || null, provider: "facebook" };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") return null;
      throw err;
    }
  } else {
    if (!popup) throw new Error("Popup required for production auth");
    return signInWithRelay("facebook", popup);
  }
}

/**
 * Check for redirect result after returning from OAuth provider (legacy fallback).
 */
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const providerId = result.user.providerData?.[0]?.providerId;
    const isFacebook = providerId === "facebook.com";
    const credential = isFacebook
      ? FacebookAuthProvider.credentialFromResult(result)
      : GoogleAuthProvider.credentialFromResult(result);
    return { user: result.user, token: credential?.accessToken || null };
  } catch {
    return null;
  }
}

/**
 * Get the auth provider from a Firebase user object.
 */
export function getProviderFromUser(fbUser: FirebaseUser): "google" | "facebook" | "email" {
  const providerId = fbUser.providerData?.[0]?.providerId;
  if (providerId === "facebook.com") return "facebook";
  if (providerId === "google.com") return "google";
  return "email";
}

/**
 * Listen for auth state changes (universal — works for redirect and cached sessions).
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
}

export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}
