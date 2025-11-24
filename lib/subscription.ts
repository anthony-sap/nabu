import "server-only";

import { UserSubscriptionPlan } from "types";
// @ts-nocheck
// TODO: Fix this when we turn strict mode on.
import { pricingData } from "@/config/subscriptions";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { PlanCode } from "@/lib/entitlements/types";

/**
 * Map Stripe price ID to plan code
 * 
 * Determines the plan code based on Stripe subscription.
 */
export function getPlanFromSubscription(
  stripePriceId: string | null | undefined
): PlanCode {
  if (!stripePriceId) {
    return 'free';
  }

  // Find which plan this price ID belongs to
  const plan = pricingData.find(
    (p) => p.stripeIds.monthly === stripePriceId || p.stripeIds.yearly === stripePriceId
  );

  // Map old plan names to new plan codes
  // This will be updated when we migrate pricing config
  if (plan?.title === 'Pro' || plan?.title === 'Personal') {
    return 'personal';
  }
  
  if (plan?.title === 'Business' || plan?.title === 'Teams') {
    return 'teams';
  }

  return 'free';
}

export async function getUserSubscriptionPlan(
  userId: string,
): Promise<UserSubscriptionPlan> {
  if (!userId) throw new Error("Missing parameters");

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      plan: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is on a paid plan.
  const isPaid =
    user.stripePriceId &&
    user.stripeCurrentPeriodEnd &&
    user.stripeCurrentPeriodEnd?.getTime() + 86_400_000 > Date.now()
      ? true
      : false;

  // Find the pricing data corresponding to the user's plan
  const userPlan =
    pricingData.find((plan) => plan.stripeIds.monthly === user.stripePriceId) ||
    pricingData.find((plan) => plan.stripeIds.yearly === user.stripePriceId);

  const plan = isPaid && userPlan ? userPlan : pricingData[0];

  const interval = isPaid
    ? userPlan?.stripeIds.monthly === user.stripePriceId
      ? "month"
      : userPlan?.stripeIds.yearly === user.stripePriceId
        ? "year"
        : null
    : null;

  let isCanceled = false;
  if (isPaid && user.stripeSubscriptionId) {
    const stripePlan = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId,
    );
    isCanceled = stripePlan.cancel_at_period_end;
  }

  // Sync plan code with Stripe subscription if needed
  // This ensures the plan field stays in sync
  const planCodeFromStripe = getPlanFromSubscription(user.stripePriceId);
  if (user.plan !== planCodeFromStripe && isPaid) {
    // Update user plan to match Stripe (async, don't await)
    prisma.user.update({
      where: { id: userId },
      data: { plan: planCodeFromStripe },
    }).catch(console.error);
  }

  return {
    ...plan,
    ...user,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime() ?? 0,
    isPaid,
    interval,
    isCanceled,
  };
}
