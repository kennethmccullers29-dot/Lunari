"use server";

import { createClient } from "@/lib/supabase/server";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createCheckoutSession(
  workspaceId: string,
  priceId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Reuse existing Stripe customer if the workspace already has one
  const { data: existing } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: existing?.stripe_customer_id ?? undefined,
    customer_email: existing?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/w/${workspaceId}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${APP_URL}/w/${workspaceId}/billing`,
    metadata:    { workspace_id: workspaceId },
    subscription_data: { metadata: { workspace_id: workspaceId } },
    allow_promotion_codes: true,
  });

  return { url: session.url! };
}

/**
 * Called on the billing page when ?success=true&session_id=... is present.
 * Reads the completed checkout session from Stripe and writes the subscription
 * state to our DB directly — bypassing the webhook for the "just paid" flow.
 */
export async function syncSubscriptionFromCheckout(
  workspaceId: string,
  sessionId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.status !== "complete" || session.mode !== "subscription") return;

  const customerId = session.customer as string;
  const sub = session.subscription as import("stripe").Stripe.Subscription | null;
  if (!sub) return;

  const item = sub.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan = planFromPriceId(priceId);
  const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end;

  await supabase.from("workspace_subscriptions").upsert(
    {
      workspace_id:           workspaceId,
      stripe_customer_id:     customerId,
      stripe_subscription_id: sub.id,
      plan,
      status:                 sub.status,
      current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end:   sub.cancel_at_period_end,
      updated_at:             new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );
}

export async function createPortalSession(
  workspaceId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sub } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) return { error: "No billing account found" };

  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.stripe_customer_id,
    return_url: `${APP_URL}/w/${workspaceId}/billing`,
  });

  return { url: session.url };
}
