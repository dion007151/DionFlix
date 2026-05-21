"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@/lib/types";
import { onAuthChange, getProviderFromUser, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { api } from "@/services/api";

const storageKey = "dionflix-user";

export function useLocalUser() {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        setUserState(JSON.parse(stored) as User);
      } else {
        setUserState(null);
      }
      setReady(true);
    };

    loadUser();

    // Listen to custom event for in-tab sync
    window.addEventListener("dionflix-user-updated", loadUser);
    // Listen to storage event for cross-tab sync
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("dionflix-user-updated", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  const setUser = (nextUser: User | null) => {
    setUserState(nextUser);
    if (nextUser) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextUser));
    } else {
      window.localStorage.removeItem(storageKey);
    }
    // Dispatch custom event to notify other components instantly
    window.dispatchEvent(new Event("dionflix-user-updated"));
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    setUser(null);
  };

  return useMemo(() => ({ user, ready, setUser, logout }), [user, ready]);
}

