import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export type Plan = "free" | "pro" | "business";

export const PLANS: Record<Plan, { name: string; priceId: string | null; priceMonthly: number }> = {
  free: {
    name: "Free",
    priceId: null,
    priceMonthly: 0,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    priceMonthly: 8,
  },
  business: {
    name: "Business",
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? "",
    priceMonthly: 15,
  },
};

/** Derive the plan name from a Stripe price ID. */
export function planFromPriceId(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return "business";
  return "free";
}
