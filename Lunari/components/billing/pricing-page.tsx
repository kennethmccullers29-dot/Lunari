"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, CreditCard, ExternalLink, Zap, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/optics/separator";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";
import type { Plan } from "@/lib/stripe";

type Subscription = {
  plan: Plan;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null;

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "Up to 5 workspace members",
    "90-day message history",
    "Text & voice channels",
    "Direct messages",
    "1 workspace",
  ],
  pro: [
    "Unlimited members",
    "Unlimited message history",
    "Team Wiki",
    "AI Assistant",
    "Boards & Calendar",
    "Voice channels",
    "Priority support",
  ],
  business: [
    "Everything in Pro",
    "SSO / SAML (coming soon)",
    "Advanced admin controls",
    "Audit logs (coming soon)",
    "Custom branding (coming soon)",
    "Dedicated support",
  ],
};

const PLANS = [
  { key: "free"     as Plan, name: "Free",     price: 0,  period: null,       badge: null },
  { key: "pro"      as Plan, name: "Pro",       price: 8,  period: "/user/mo", badge: "Most popular" },
  { key: "business" as Plan, name: "Business",  price: 15, period: "/user/mo", badge: null },
];

export function PricingPage({
  workspaceId,
  subscription,
  isOwnerOrAdmin,
  proPriceId,
  businessPriceId,
  justPaid = false,
}: {
  workspaceId: string;
  subscription: Subscription;
  isOwnerOrAdmin: boolean;
  proPriceId: string;
  businessPriceId: string;
  justPaid?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(justPaid);

  useEffect(() => {
    if (!justPaid) return;
    const timer = setTimeout(() => {
      router.refresh();
      setRefreshing(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [justPaid, router]);

  const currentPlan: Plan = subscription?.plan ?? "free";
  const isPaid = currentPlan !== "free";

  const handleUpgrade = async (plan: Plan) => {
    if (plan === "free" || plan === currentPlan) return;
    setError(null);
    setLoading(plan);

    const priceId = plan === "pro" ? proPriceId : businessPriceId;

    if (!priceId) {
      setError("Stripe price IDs are not configured.");
      setLoading(null);
      return;
    }

    const { url, error: err } = await createCheckoutSession(workspaceId, priceId);
    if (err || !url) { setError(err ?? "Could not start checkout"); setLoading(null); return; }
    window.location.href = url;
  };

  const handleManage = async () => {
    setPortalLoading(true);
    const { url, error: err } = await createPortalSession(workspaceId);
    if (err || !url) { setError(err ?? "Could not open portal"); setPortalLoading(false); return; }
    window.location.href = url;
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator orientation="vertical" className="mx-1 h-4 md:hidden" />
        <CreditCard className="size-4 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">Billing</h1>

        {isPaid && (
          <button
            type="button"
            onClick={handleManage}
            disabled={portalLoading}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <ExternalLink className="size-3.5" />
            {portalLoading ? "Opening…" : "Manage subscription"}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        {/* Post-checkout processing banner */}
        {justPaid && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 text-sm"
          >
            {refreshing ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            ) : (
              <Check className="size-4 shrink-0 text-primary" />
            )}
            <span className="text-foreground">
              {refreshing
                ? "Payment confirmed — loading your new plan…"
                : "Your plan has been updated!"}
            </span>
          </motion.div>
        )}

        {/* Current plan banner */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-1 rounded-xl border border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Current plan:{" "}
                <span className="text-primary capitalize">{currentPlan}</span>
                {subscription.status === "past_due" && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    Payment past due
                  </span>
                )}
                {subscription.cancel_at_period_end && (
                  <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Cancels at period end
                  </span>
                )}
              </p>
              {subscription.current_period_end && isPaid && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Access until" : "Renews"}{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString([], {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              )}
            </div>
            {isPaid && (
              <button
                type="button"
                onClick={handleManage}
                disabled={portalLoading}
                className="mt-2 flex w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60 sm:mt-0"
              >
                <ExternalLink className="size-3" />
                {portalLoading ? "Opening…" : "Manage"}
              </button>
            )}
          </motion.div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan, i) => {
            const isCurrent = plan.key === currentPlan;
            const isUpgrade = !isCurrent && plan.key !== "free" && plan.price > (PLANS.find(p => p.key === currentPlan)?.price ?? 0);

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06, ease: "easeOut" }}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.key === "pro"
                    ? "border-primary shadow-md shadow-primary/10"
                    : "border-border"
                } ${isCurrent ? "bg-primary/5" : "bg-card"}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    {plan.badge}
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-4 rounded-full bg-muted border border-border px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                    Current plan
                  </span>
                )}

                <div className="mb-4">
                  <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="mb-6 flex-1 space-y-2">
                  {PLAN_FEATURES[plan.key].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="flex h-9 items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground">
                    Current plan
                  </div>
                ) : plan.key === "free" ? (
                  <div className="flex h-9 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                    Free forever
                  </div>
                ) : isOwnerOrAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={loading !== null || portalLoading}
                    className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 ${
                      plan.key === "pro"
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {loading === plan.key ? (
                      "Redirecting…"
                    ) : (
                      <>
                        {isUpgrade && <Zap className="size-3.5" />}
                        {isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex h-9 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">
                    Contact your workspace owner
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prices are per workspace. Payments processed securely by Stripe.
          <br />
          Cancel anytime — no lock-in.
        </p>
      </div>
    </div>
  );
}
