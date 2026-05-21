"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { User as FirebaseUser, UserInfo } from "firebase/auth";
import { api } from "@/services/api";
import { useLocalUser } from "@/hooks/useLocalUser";
import { AppShell } from "./AppShell";
import { signInWithFacebook, signInWithGoogle, checkRedirectResult, onAuthChange, getProviderFromUser, loginWithEmail, registerWithEmail } from "@/lib/firebase";

function SafeAvatar({ user }: { user: any }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [user?.id, user?.avatar]);

  const initials = user?.name
    ? user.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  if (failed || !user?.avatar || !user.avatar.startsWith("http")) {
    return <span className="text-sm font-black">{user?.avatar && user.avatar.length <= 2 ? user.avatar : initials}</span>;
  }

  return (
    <img 
      src={user.avatar} 
      alt="Profile" 
      className="h-full w-full object-cover" 
      onError={() => setFailed(true)}
    />
  );
}

export function AuthPanel() {
  const router = useRouter();
  const { user, setUser, logout } = useLocalUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const processedRef = useRef(false);

  const processFirebaseUser = async (fbUser: FirebaseUser, provider: "google" | "facebook" | "email", token?: string | null) => {
    if (processedRef.current) return;
    processedRef.current = true;

    const userEmail = fbUser.email || `${fbUser.uid}@oauth.com`;
    let avatar = fbUser.photoURL || (provider === "google" ? "G" : "FB");

    // For Facebook, try multiple methods to get HD profile picture
    if (provider === "facebook") {
      const fbData = fbUser.providerData?.find((p: UserInfo) => p.providerId === "facebook.com");
      const fbUid = fbData?.uid;

      if (fbUid && token) {
        // Method 1: Use access token with Graph API (most reliable)
        try {
          const res = await fetch(`https://graph.facebook.com/${fbUid}/picture?type=large&width=200&height=200&redirect=false&access_token=${token}`);
          const json = await res.json();
          if (json?.data && !json.data.is_silhouette && json.data.url) {
            avatar = json.data.url;
          } else {
            // Method 2: Direct URL construction
            avatar = `https://graph.facebook.com/${fbUid}/picture?type=large&width=200&height=200&access_token=${token}`;
          }
        } catch {
          avatar = `https://graph.facebook.com/${fbUid}/picture?type=large&width=200&height=200&access_token=${token}`;
        }
      } else if (fbUser.photoURL) {
        // Prioritize Firebase's pre-resolved photo URL (which is a valid Facebook CDN link)
        avatar = fbUser.photoURL;
      } else if (fbUid) {
        // Fallback without token (may return silhouette)
        avatar = `https://graph.facebook.com/${fbUid}/picture?type=large&width=200&height=200`;
      }
    }

    const nextUser = await api.firebaseLogin(
      fbUser.displayName || userEmail.split("@")[0],
      userEmail,
      fbUser.uid,
      avatar,
      provider
    );
    setUser(nextUser);
    setSuccess(`Welcome back to DionFlix, ${fbUser.displayName || "User"}! Logging you in...`);
    setLoading(false);
    setTimeout(() => {
      router.push("/profile");
    }, 1500);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const fbUser = mode === "login" 
        ? await loginWithEmail(email, password)
        : await registerWithEmail(name, email, password);
        
      if (!fbUser.email) throw new Error("Email is required");

      const displayName = fbUser.displayName || name || fbUser.email.split("@")[0];
      const initials = displayName
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

      const nextUser = await api.firebaseLogin(
        displayName,
        fbUser.email,
        fbUser.uid,
        fbUser.photoURL || initials,
        "email"
      );
      
      setUser(nextUser);
      setSuccess(mode === "login" ? "Welcome back to DionFlix! Logging you in..." : "Account created successfully! Logging you in...");
      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const handleFirebase = async (provider: "google" | "facebook", popup: Window | null) => {
    setError("");
    setLoading(true);
    try {
      const result = provider === "google"
        ? await signInWithGoogle(popup)
        : await signInWithFacebook(popup);

      if (result && result.user) {
        await processFirebaseUser(result.user, provider, result.token);
      }
    } catch (err) {
      if (popup && !popup.closed) popup.close();
      setLoading(false);
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const [origin, setOrigin] = useState("https://dion-flix-flf1.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Global listener for auth relay messages
  useEffect(() => {
    // 1. Listen for messages from the relay popup (Legacy support)
    const messageHandler = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== "DIONFLIX_AUTH_RESULT") return;
      handleRelayResult(event.data);
    };

    window.addEventListener("message", messageHandler);

    // 2. Check for redirect result from the new hash-based Relay flow
    if (typeof window !== "undefined" && window.location.hash.startsWith("#relay=")) {
      try {
        const payloadStr = window.location.hash.replace("#relay=", "");
        const data = JSON.parse(decodeURIComponent(atob(payloadStr)));
        
        // Clean up the URL hash so it doesn't stay there
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        
        handleRelayResult(data);
      } catch (err) {
        console.error("Failed to parse relay hash:", err);
      }
    }

    // 3. Check for legacy redirect results
    checkRedirectResult().then(async (fbResult) => {
      if (fbResult && fbResult.user) {
        const provider = getProviderFromUser(fbResult.user);
        await processFirebaseUser(fbResult.user, provider, fbResult.token);
      }
    }).catch(() => {});

    return () => {
        window.removeEventListener("message", messageHandler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleRelayResult = (data: any) => {
    const { success, error, user: relayUser, provider } = data;
    
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    if (success && relayUser) {
      // Because we already verified the user on the secure dionflix.firebaseapp.com domain
      // and received the payload back, we can skip the error-prone Vercel-side Firebase signIn
      // and directly log the user into our local database!
      processFirebaseUser(relayUser as FirebaseUser, provider, relayUser.accessToken).catch((err) => {
        setError(err instanceof Error ? err.message : "Authentication failed");
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <section className="relative min-h-screen overflow-hidden px-4 py-28 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-45">
          <img
            src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=2200&q=85"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-flare">Profiles and persistence</p>
            <h1 className="mt-4 text-5xl font-black leading-none text-white sm:text-7xl">Your watchlist follows you.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
              Log in or create an account to start streaming. DionFlix securely stores favorites, history, and playback
              position across all your devices.
            </p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submit}
            className="glass rounded-md p-5"
          >
            {user ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-flare via-plasma to-volt text-2xl font-black shadow-glow mb-4">
                  <SafeAvatar user={user} />
                </div>
                
                <span className="text-xs font-bold uppercase tracking-widest text-flare">Active Session</span>
                <h2 className="mt-1 text-2xl font-black text-white">{user.name}</h2>
                <p className="mt-1 text-sm text-white/50">{user.email}</p>

                <div className="mt-8 flex w-full flex-col gap-3">
                  <button 
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white font-black text-ink transition hover:scale-[1.02]"
                  >
                    Go to My Profile
                  </button>
                  <button 
                    type="button"
                    onClick={() => router.push("/")}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 font-bold text-white transition hover:bg-white/10"
                  >
                    Browse Content
                  </button>
                  <button 
                    type="button" 
                    onClick={logout} 
                    className="mt-4 text-sm font-semibold text-white/40 hover:text-flare transition underline underline-offset-4"
                  >
                    Sign Out / Switch Profile
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex rounded-md border border-white/10 bg-white/5 p-1">
                  {(["login", "register"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMode(item)}
                      className={`h-11 flex-1 rounded text-sm font-black capitalize transition ${
                        mode === item ? "bg-white text-ink" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {mode === "register" && (
                  <label className="mb-3 block">
                    <span className="mb-2 block text-sm font-bold text-white/70">Name</span>
                    <span className="relative block">
                      <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="h-12 w-full rounded-md border border-white/10 bg-white/8 pl-11 pr-3 outline-none focus:border-plasma"
                        placeholder="Full Name"
                      />
                    </span>
                  </label>
                )}

                <label className="mb-3 block">
                  <span className="mb-2 block text-sm font-bold text-white/70">Email</span>
                  <span className="relative block">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-md border border-white/10 bg-white/8 pl-11 pr-3 outline-none focus:border-plasma"
                    />
                  </span>
                </label>

                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-bold text-white/70">Password</span>
                  <span className="relative block">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-md border border-white/10 bg-white/8 pl-11 pr-3 outline-none focus:border-plasma"
                    />
                  </span>
                </label>

                {error && <p className="mb-4 rounded-md border border-flare/40 bg-flare/15 p-3 text-sm text-red-100">{error}</p>}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-md border border-volt/40 bg-volt/15 p-3 text-sm text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    {success}
                  </motion.p>
                )}

                <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white font-black text-ink transition hover:scale-[1.02]">
                  {mode === "login" ? "Enter DionFlix" : "Create Profile"}
                </button>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40">Or continue with</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <a
                    href={`https://dionflix.firebaseapp.com/auth-relay.html?provider=google&origin=${encodeURIComponent(origin)}&v=2`}
                    onClick={() => setLoading(true)}
                    className="flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 font-bold text-white transition hover:bg-white/10"
                    style={{ pointerEvents: loading ? "none" : "auto", opacity: loading ? 0.5 : 1 }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </a>
                  <a
                    href={`https://dionflix.firebaseapp.com/auth-relay.html?provider=facebook&origin=${encodeURIComponent(origin)}&v=2`}
                    onClick={() => setLoading(true)}
                    className="flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-[#1877F2]/10 font-bold text-white transition hover:bg-[#1877F2]/20 text-[#1877F2]"
                    style={{ pointerEvents: loading ? "none" : "auto", opacity: loading ? 0.5 : 1 }}
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </a>
                </div>
              </>
            )}
          </motion.form>
        </div>
      </section>
    </AppShell>
  );
}
