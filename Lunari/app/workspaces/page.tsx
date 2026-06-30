import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { JoinWorkspaceForm } from "@/components/workspace/join-workspace-form";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/optics/button";
import { Avatar, AvatarFallback } from "@/components/optics/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/optics/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/optics/tabs";
import { ChevronRight, Command } from "lucide-react";
import { getWorkspaceGradient } from "@/lib/workspace-color";
import { cn } from "@/lib/utils";
import { FirstRunModal } from "@/components/onboarding/first-run-modal";

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded_at")
    .eq("id", userData.user.id)
    .single();

  const { data } = await supabase
    .from("workspace_members")
    .select("workspaces(id, name)")
    .eq("user_id", userData.user.id);

  const memberships = (data ?? []) as unknown as {
    workspaces: { id: string; name: string } | null;
  }[];

  const workspaces = memberships
    .map((m) => m.workspaces)
    .filter((w): w is { id: string; name: string } => !!w);

  return (
    <div className="min-h-svh bg-muted/30">
      {profile && !profile.onboarded_at && (
        <FirstRunModal initialName={profile.display_name ?? ""} />
      )}
      <header className="flex items-center justify-between border-b bg-background px-6 py-3.5">
        <div className="flex items-center gap-2 font-medium">
          <div className="flex size-7 items-center justify-center rounded-lg bg-black text-white">
            <Command className="size-4" />
          </div>
          Lunari
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </header>

      <div className="mx-auto max-w-md px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Your workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Pick a workspace to jump back in, or add a new one below.
          </p>
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {workspaces.length > 0 ? (
          <Card className="mb-6 py-0">
            <CardContent className="divide-y px-0">
              {workspaces.map((w) => (
                <Link
                  key={w.id}
                  href={`/w/${w.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <Avatar>
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br font-bold text-white uppercase",
                        getWorkspaceGradient(w.id)
                      )}
                    >
                      {w.name.trim().charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm font-medium">{w.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="mb-6 text-sm text-muted-foreground">
            You&apos;re not in any workspaces yet.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add a workspace</CardTitle>
            <CardDescription>Start a new one or join with an invite code.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create">
              <TabsList className="w-full">
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="join">Join</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="pt-4">
                <CreateWorkspaceForm />
              </TabsContent>
              <TabsContent value="join" className="pt-4">
                <JoinWorkspaceForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
