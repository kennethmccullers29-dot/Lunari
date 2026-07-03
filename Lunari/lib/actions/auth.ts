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

  // If the user has MFA enrolled, they must complete the TOTP challenge
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/mfa?redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
}

export async function verifyMfa(formData: FormData) {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const redirectTo = safeRedirectUrl(String(formData.get("redirect") ?? ""), "/workspaces");

  const supabase = await createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError || !factors?.totp?.length) {
    redirect(`/mfa?error=No+authenticator+found&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const factor = factors.totp.find((f) => f.status === "verified") ?? factors.totp[0];

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) {
    redirect(`/mfa?error=${encodeURIComponent(challengeError.message)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    redirect(`/mfa?error=${encodeURIComponent(verifyError.message)}&redirect=${encodeURIComponent(redirectTo)}`);
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
