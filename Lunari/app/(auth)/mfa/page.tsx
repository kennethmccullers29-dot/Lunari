import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyMfa } from "@/lib/actions/auth";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Command, ShieldCheck } from "lucide-react";
import { AuroraBars } from "@/components/unlumen-ui/aurora-bars";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: redirectTo } = await searchParams;

  // If there's no active session at all, send them to login
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-7 items-center justify-center rounded-lg bg-black text-white">
              <Command className="size-4" />
            </div>
            Lunari
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form action={verifyMfa} className="flex flex-col gap-6">
              {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <ShieldCheck className="size-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold">Two-factor authentication</h1>
                  <p className="text-sm text-muted-foreground text-balance">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>

                {error && (
                  <p className="text-center text-sm text-destructive">{decodeURIComponent(error)}</p>
                )}

                <Field>
                  <FieldLabel htmlFor="code">Authentication code</FieldLabel>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000 000"
                    maxLength={7}
                    required
                    autoFocus
                  />
                </Field>

                <Field>
                  <Button type="submit" className="w-full">Verify</Button>
                </Field>

                <FieldDescription className="text-center">
                  Lost access to your app?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Sign in again
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:block rounded-2xl p-4">
        <AuroraBars className="rounded-2xl" />
        <div className="absolute bg-black/50 inset-4 flex flex-col items-start justify-end rounded-2xl p-10 text-white">
          <h2 className="font-playfair text-6xl leading-[1.2] font-medium">
            Where your team
            <br />
            comes together.
          </h2>
          <p className="mt-5 max-w-sm text-md text-white/70">
            Real-time messaging, channels, and shared spaces — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
