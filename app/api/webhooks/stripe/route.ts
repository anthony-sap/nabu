import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";

import { env } from "@/env";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve the subscription details from Stripe.
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Update the user stripe into in our database.
    // Since this is the initial subscription, we need to update
    // the subscription id and customer id.
    const userUpdateData: Prisma.UserUpdateInput = {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: null,
    };
    if (subscription.cancel_at) {
      userUpdateData.stripeCurrentPeriodEnd = new Date(
        subscription.cancel_at * 1000,
      );
    }
    await prisma.user.update({
      where: {
        id: session?.metadata?.userId,
      },
      data: userUpdateData,
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const session = event.data.object as Stripe.Invoice;

    // If the billing reason is not subscription_create, it means the customer has updated their subscription.
    // If it is subscription_create, we don't need to update the subscription id and it will handle by the checkout.session.completed event.
    if (session.billing_reason != "subscription_create") {
      // Retrieve the subscription details from Stripe.
      const subscription = await stripe.subscriptions.retrieve(
        session.parent?.subscription_details?.subscription as string,
      );

      // Update the price id and set the new period end.
      const userUpdateData: Prisma.UserUpdateInput = {
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: null,
      };
      if (subscription.cancel_at) {
        userUpdateData.stripeCurrentPeriodEnd = new Date(
          subscription.cancel_at * 1000,
        );
      }
      await prisma.user.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: userUpdateData,
      });
    }
  }

  return NextResponse.json({ received: true });
}
