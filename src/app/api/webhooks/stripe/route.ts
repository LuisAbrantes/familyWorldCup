import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { authorizedCreators, rooms, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === "production" || webhookSecret) {
      if (!webhookSecret) {
        return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured in production" }, { status: 500 });
      }
      if (!sig) {
        return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
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

        // Pre-create room for the user
        const existingRoom = await db.query.rooms.findFirst({
          where: eq(rooms.adminEmail, email),
        });

        if (!existingRoom) {
          // Find any user to act as temporary creator (usually super admin or the first user)
          const firstUser = await db.query.users.findFirst();
          const creatorUserId = firstUser ? firstUser.id : 1; // Fallback to 1 if no users exist yet

          // Generate unique 6-character invite code
          let inviteCode = "";
          let isUnique = false;
          let attempts = 0;
          while (!isUnique && attempts < 10) {
            inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existingCode = await db.query.rooms.findFirst({
              where: eq(rooms.inviteCode, inviteCode),
            });
            if (!existingCode) {
              isUnique = true;
            }
            attempts++;
          }
          if (!isUnique) {
            inviteCode = `COPA${Math.floor(10 + Math.random() * 90)}`;
          }

          const emailPrefix = email.split("@")[0];
          const roomName = `Grupo de ${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)}`;

          await db.insert(rooms).values({
            name: roomName,
            inviteCode,
            creatorUserId,
            adminEmail: email,
          });
          console.log(`[Stripe Webhook] Automatically pre-created room "${roomName}" for ${email}`);
        }
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
