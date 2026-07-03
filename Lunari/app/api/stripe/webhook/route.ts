import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// Disable Next.js body parsing — Stripe needs the raw body to verify signatures
export const dynamic = "force-dynamic";

async function upsertSubscription(
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  subscription: Stripe.Subscription
) {
  const item      = subscription.items.data[0];
  const priceId   = item?.price.id ?? "";
  const plan      = planFromPriceId(priceId);
  // current_period_end lives on the subscription item in SDK v22+
  const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end;

  await supabase.from("workspace_subscriptions").upsert(
    {
      workspace_id:           workspaceId,
      stripe_subscription_id: subscription.id,
      plan,
      status:                 subscription.status,
      current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end:   subscription.cancel_at_period_end,
      updated_at:             new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );
}

export async function POST(request: Request) {
  const body      = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const workspaceId = session.metadata?.workspace_id;
      if (!workspaceId) break;

      // Save the Stripe customer ID so future checkouts reuse the same customer
      await supabase.from("workspace_subscriptions").upsert(
        {
          workspace_id:       workspaceId,
          stripe_customer_id: session.customer as string,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );
      revalidatePath(`/w/${workspaceId}/billing`);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId  = subscription.metadata?.workspace_id;
      if (!workspaceId) break;
      await upsertSubscription(supabase, workspaceId, subscription);
      revalidatePath(`/w/${workspaceId}/billing`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId  = subscription.metadata?.workspace_id;
      if (!workspaceId) break;

      await supabase
        .from("workspace_subscriptions")
        .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
      revalidatePath(`/w/${workspaceId}/billing`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice     = event.data.object as Stripe.Invoice;
      const subRef      = invoice.parent?.subscription_details?.subscription;
      if (!subRef) break;
      const subId       = typeof subRef === "string" ? subRef : subRef.id;

      const sub         = await stripe.subscriptions.retrieve(subId);
      const workspaceId = sub.metadata?.workspace_id;
      if (!workspaceId) break;

      await supabase
        .from("workspace_subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
      revalidatePath(`/w/${workspaceId}/billing`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
