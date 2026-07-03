import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PricingPage } from "@/components/billing/pricing-page";
import { syncSubscriptionFromCheckout } from "@/lib/actions/billing";
import type { Plan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ success?: string; session_id?: string }>;
}) {
  const [{ workspaceId }, sp] = await Promise.all([params, searchParams]);

  // If Stripe just redirected here after a successful checkout, sync immediately
  // from the Stripe API so we don't have to wait for the webhook.
  if (sp.success === "true" && sp.session_id) {
    await syncSubscriptionFromCheckout(workspaceId, sp.session_id);
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: membership }, { data: sub }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("workspace_subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  if (!membership) redirect("/workspaces");

  const isOwnerOrAdmin =
    membership.role === "owner" || membership.role === "admin";

  return (
    <PricingPage
      workspaceId={workspaceId}
      subscription={
        sub
          ? {
              plan: sub.plan as Plan,
              status: sub.status,
              current_period_end: sub.current_period_end,
              cancel_at_period_end: sub.cancel_at_period_end,
            }
          : null
      }
      isOwnerOrAdmin={isOwnerOrAdmin}
      proPriceId={process.env.STRIPE_PRO_PRICE_ID ?? ""}
      businessPriceId={process.env.STRIPE_BUSINESS_PRICE_ID ?? ""}
      justPaid={sp.success === "true"}
    />
  );
}
