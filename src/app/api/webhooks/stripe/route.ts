import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { authorizedCreators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // If no secret is configured, bypass verification in non-production environments
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Missing webhook secret in production" }, { status: 400 });
      }
      console.warn("[Stripe Webhook] Bypassing signature verification in development mode.");
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email?.toLowerCase().trim();

    if (email) {
      console.log(`[Stripe Webhook] Authorizing creator email: ${email}`);
      try {
        // Check if email is already in authorizedCreators
        const existing = await db.query.authorizedCreators.findFirst({
          where: eq(authorizedCreators.email, email),
        });

        if (existing) {
          // Increment roomsAllowed
          await db
            .update(authorizedCreators)
            .set({ roomsAllowed: existing.roomsAllowed + 1 })
            .where(eq(authorizedCreators.email, email));
        } else {
          // Insert new authorizedCreator
          await db.insert(authorizedCreators).values({
            email,
            roomsAllowed: 1,
          });
        }
        console.log(`[Stripe Webhook] Successfully authorized ${email}`);
      } catch (dbErr) {
        console.error("[Stripe Webhook] Database error:", dbErr);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    } else {
      console.warn("[Stripe Webhook] Checkout session completed without customer email.");
    }
  }

  return NextResponse.json({ received: true });
}
