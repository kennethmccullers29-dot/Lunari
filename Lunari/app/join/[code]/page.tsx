import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/optics/button";
import { Command } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg bg-black text-white">
          <Command className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">You&apos;ve been invited to Lunari</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in or create an account to accept your invitation.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Link
            href={`/signup?redirect=/join/${code}`}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full justify-center")}
          >
            Create account
          </Link>
          <Link
            href={`/login?redirect=/join/${code}`}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full justify-center")}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const { data, error } = await supabase.rpc("join_workspace_by_code", {
    _join_code: code,
  });

  if (error || !data) {
    const msg = encodeURIComponent(
      error?.message === "Invalid join code"
        ? "This invite link is invalid or has expired."
        : (error?.message ?? "Could not join workspace")
    );
    redirect(`/workspaces?error=${msg}`);
  }

  const workspace = data as unknown as { id: string };
  redirect(`/w/${workspace.id}`);
}
