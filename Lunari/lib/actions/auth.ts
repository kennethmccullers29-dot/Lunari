"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeRedirectUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, "http://localhost");
    if (url.hostname !== "localhost") return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectUrl(String(formData.get("redirect") ?? ""), "/workspaces");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const redirectParam = redirectTo !== "/workspaces" ? `&redirect=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/login?error=${encodeURIComponent(error.message)}${redirectParam}`);
  }

  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");
  const redirectTo = safeRedirectUrl(String(formData.get("redirect") ?? ""), "/workspaces");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    const redirectParam = redirectTo !== "/workspaces" ? `&redirect=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/signup?error=${encodeURIComponent(error.message)}${redirectParam}`);
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
