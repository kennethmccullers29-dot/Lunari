"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { ShieldCheck, ShieldOff, Smartphone } from "lucide-react";

type MfaFactor = { id: string; status: string };
type EnrollState = { factorId: string; qrCode: string; secret: string } | null;

export function MfaSettings() {
  const [factor, setFactor] = useState<MfaFactor | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const loadFactor = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified") ?? null;
    setFactor(verified);
    setLoading(false);
  };

  useEffect(() => { loadFactor(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEnroll = async () => {
    setError(null);
    setSuccess(null);
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Lunari" });
    if (err || !data) { setError(err?.message ?? "Could not start setup"); return; }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  };

  const confirmEnroll = async () => {
    if (!enrolling || !code.trim()) return;
    setVerifying(true);
    setError(null);

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (cErr || !challenge) { setError(cErr?.message ?? "Challenge failed"); setVerifying(false); return; }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ""),
    });

    setVerifying(false);
    if (vErr) { setError(vErr.message); return; }

    setEnrolling(null);
    setCode("");
    setSuccess("Authenticator app enabled.");
    await loadFactor();
  };

  const cancelEnroll = async () => {
    if (enrolling) {
      await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    }
    setEnrolling(null);
    setCode("");
    setError(null);
  };

  const removeMfa = async () => {
    if (!factor) return;
    setRemoving(true);
    setError(null);
    setSuccess(null);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setRemoving(false);
    if (err) { setError(err.message); return; }
    setFactor(null);
    setSuccess("Authenticator app removed.");
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading security settings…</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}

      {/* ── Enrolled state ── */}
      {factor && !enrolling && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Authenticator app enabled</p>
              <p className="text-xs text-muted-foreground">You&apos;ll be prompted for a code at each login.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={removeMfa}
            disabled={removing}
            className="shrink-0 text-destructive hover:text-destructive"
          >
            <ShieldOff className="size-3.5 mr-1" />
            {removing ? "Removing…" : "Remove"}
          </Button>
        </div>
      )}

      {/* ── Not enrolled ── */}
      {!factor && !enrolling && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <ShieldOff className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Add a second layer of security to your account.</p>
            </div>
          </div>
          <Button type="button" size="sm" onClick={startEnroll} className="shrink-0">
            Enable
          </Button>
        </div>
      )}

      {/* ── Enrollment flow ── */}
      {enrolling && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 shrink-0" />
            <p className="text-sm font-medium">Set up authenticator app</p>
          </div>

          <ol className="space-y-4 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1. </span>
              Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
            </li>
          </ol>

          {/* QR code — Supabase returns an SVG data URI */}
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qrCode}
              alt="MFA QR code"
              width={180}
              height={180}
              className="rounded-lg border"
            />
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Can&apos;t scan? Enter code manually
            </summary>
            <p className="mt-1 font-mono break-all rounded bg-muted px-2 py-1">{enrolling.secret}</p>
          </details>

          <div>
            <p className="mb-2 text-sm">
              <span className="font-medium text-foreground">2. </span>
              Enter the 6-digit code from the app to confirm:
            </p>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000 000"
              maxLength={7}
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); confirmEnroll(); } }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={confirmEnroll}
              disabled={verifying || !code.trim()}
              className="flex-1"
            >
              {verifying ? "Verifying…" : "Confirm"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEnroll} disabled={verifying}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
