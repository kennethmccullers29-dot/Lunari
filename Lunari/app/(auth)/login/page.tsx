import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Command } from "lucide-react";
import { AuroraBars } from "@/components/unlumen-ui/aurora-bars";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: redirectTo } = await searchParams;

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
            <form action={signIn} className="flex flex-col gap-6">
                {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Login to your account</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Enter your email below to login to your account
                  </p>
                </div>
                {error && (
                  <p className="text-center text-sm text-destructive">{error}</p>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="john.doe@example.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </Field>
                <Field>
                  <Button type="submit">Login</Button>
                </Field>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4">
                    Sign up
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
