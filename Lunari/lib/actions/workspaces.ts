"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/workspaces?error=Workspace name is required");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", {
    _name: name,
    _slug: slugify(name),
  });

  if (error || !data) {
    redirect(`/workspaces?error=${encodeURIComponent(error?.message ?? "Could not create workspace")}`);
  }

  redirect(`/w/${data.id}`);
}

export async function joinWorkspace(formData: FormData) {
  const joinCode = String(formData.get("join_code") ?? "").trim();
  if (!joinCode) redirect("/workspaces?error=Join code is required");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_workspace_by_code", {
    _join_code: joinCode,
  });

  if (error || !data) {
    redirect(`/workspaces?error=${encodeURIComponent(error?.message ?? "Invalid join code")}`);
  }

  redirect(`/w/${data.id}`);
}

export async function regenerateJoinCode(
  workspaceId: string
): Promise<{ joinCode: string } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { data, error } = await supabase.rpc("regenerate_join_code", {
    _workspace_id: workspaceId,
  });

  if (error || !data) return { error: error?.message ?? "Could not regenerate code" };

  revalidatePath(`/w/${workspaceId}`, "layout");
  return { joinCode: (data as unknown as { join_code: string }).join_code };
}

export async function sendWorkspaceInvite(
  workspaceId: string,
  email: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { data: memberRow } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .single();

  if (!memberRow || !["owner", "admin"].includes(memberRow.role)) {
    return { error: "Only workspace owners and admins can send invites" };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, join_code")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return { error: "Workspace not found" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userData.user.id)
    .single();

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const inviteUrl = `${origin}/join/${workspace.join_code}`;
  const inviterName = profile?.display_name ?? "A teammate";

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Lunari <onboarding@resend.dev>",
    to: email,
    subject: `${inviterName} invited you to join ${workspace.name} on Lunari`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">
          You've been invited to ${workspace.name}
        </h2>
        <p style="color: #555; margin-bottom: 24px;">
          ${inviterName} has invited you to join the <strong>${workspace.name}</strong> workspace on Lunari.
        </p>
        <a href="${inviteUrl}"
           style="display: inline-block; background: #611f69; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 600; font-size: 15px;">
          Accept invitation
        </a>
        <p style="margin-top: 24px; font-size: 13px; color: #888;">
          Or copy this link: ${inviteUrl}
        </p>
        <p style="font-size: 12px; color: #aaa; margin-top: 32px;">
          If you weren't expecting this invitation, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (emailError) return { error: emailError.message };
  return {};
}
