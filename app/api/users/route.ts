import { NextResponse } from "next/server";
import { readDb, sanitizeUser, writeDb } from "@/lib/db";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    action: "login" | "register" | "firebase";
    name?: string;
    email: string;
    password?: string;
    uid?: string;
    avatar?: string;
    provider?: "google" | "facebook" | "email";
  };

  const db = await readDb();

  if (payload.action === "firebase") {
    let user = db.users.find((candidate) => candidate.email === payload.email || candidate.id === payload.uid);
    if (!user) {
      user = {
        id: payload.uid || `firebase-${Date.now()}`,
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        avatar: payload.avatar || (payload.provider === "google" ? "G" : "FB"),
        provider: payload.provider
      };
      db.users.push(user);
      await writeDb(db);
    } else {
      let updated = false;
      if (payload.name && payload.name !== user.name) {
        user.name = payload.name;
        updated = true;
      }
      
      const shouldUpdateAvatar = (current: string | undefined, incoming: string | undefined) => {
        if (!incoming) return false;
        if (!current) return true;
        if (current === incoming) return false;
        
        // Never overwrite a real photo URL with a single-letter placeholder or default letters
        if (incoming === "G" || incoming === "FB" || incoming.length <= 2) {
          return false;
        }
        
        // Never overwrite a valid resolved URL with a tokenless Graph API URL
        if (incoming.includes("graph.facebook.com") && !incoming.includes("access_token")) {
          if (current.startsWith("http") && !current.includes("graph.facebook.com")) {
            return false;
          }
        }
        
        return true;
      };

      if (shouldUpdateAvatar(user.avatar, payload.avatar)) {
        user.avatar = payload.avatar!;
        updated = true;
      }
      if (payload.provider && payload.provider !== user.provider) {
        user.provider = payload.provider;
        updated = true;
      }
      if (updated) {
        await writeDb(db);
      }
    }
    return NextResponse.json(sanitizeUser(user));
  }

  if (payload.action === "login") {
    const user = db.users.find((candidate) => candidate.email === payload.email && candidate.password === payload.password);

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json(sanitizeUser(user));
  }

  const existing = db.users.find((candidate) => candidate.email === payload.email);
  if (existing) {
    return NextResponse.json({ message: "Email is already registered" }, { status: 409 });
  }

  const name = payload.name?.trim() || payload.email.split("@")[0];
  const user = {
    id: `user-${Date.now()}`,
    name,
    email: payload.email,
    password: payload.password,
    avatar: name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    provider: "email" as const
  };

  db.users.push(user);
  await writeDb(db);

  return NextResponse.json(sanitizeUser(user), { status: 201 });
}
