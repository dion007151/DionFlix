"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Heart, Search, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useLocalUser } from "@/hooks/useLocalUser";

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

const navItems = [
  { href: "/", label: "Home", icon: Clapperboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useLocalUser();

  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform group-hover:scale-105">
              <img 
                src="/new_logo_transparent.png" 
                alt="Logo" 
                className="h-full w-full object-contain" 
              />
            </div>
            <span className="text-xl font-black tracking-[0.18em] text-white">DIONFLIX</span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 sm:flex">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
                >
                  {active && (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute inset-0 rounded-full bg-white/12"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {item.href === "/profile" && user ? (
                    (user.provider === "google" || user.avatar?.includes("googleusercontent.com")) ? (
                      <svg className="relative h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    ) : (user.provider === "facebook" || (!user.provider && (user.email?.includes("@facebook.com") || user.email?.includes("@oauth.com") || user.avatar === "FB" || user.avatar?.includes("facebook.com")))) ? (
                      <svg className="relative h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    ) : (
                      <Icon className="relative h-4 w-4" />
                    )
                  ) : (
                    <Icon className="relative h-4 w-4" />
                  )}
                  <span className="relative">{item.href === "/profile" && user ? user.name.split(" ")[0] : item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:border-plasma/60 hover:text-white sm:flex"
            >
              <Heart className="h-4 w-4 text-flare" />
              My List
            </Link>
            <Link
              href="/auth"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-ink shadow-red-glow"
              title={user?.name || "Login"}
            >
              {user ? (
                <SafeAvatar user={user} />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {children}

      <nav className="fixed inset-x-4 bottom-4 z-50 grid grid-cols-3 rounded-full border border-white/10 bg-ink/80 p-2 shadow-glow backdrop-blur-2xl sm:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center rounded-full px-3 py-2 text-xs font-semibold ${
                active ? "bg-white text-ink" : "text-white/70"
              }`}
            >
              {item.href === "/profile" && user ? (
                (user.provider === "google" || user.avatar?.includes("googleusercontent.com")) ? (
                  <svg className="mb-1 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                ) : (user.provider === "facebook" || (!user.provider && (user.email?.includes("@facebook.com") || user.email?.includes("@oauth.com") || user.avatar === "FB" || user.avatar?.includes("facebook.com")))) ? (
                  <svg className="mb-1 h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                ) : (
                  <Icon className="mb-1 h-4 w-4" />
                )
              ) : (
                <Icon className="mb-1 h-4 w-4" />
              )}
              {item.href === "/profile" && user ? user.name.split(" ")[0] : item.label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
