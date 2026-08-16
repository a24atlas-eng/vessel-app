import Stripe from "stripe";
import { buffer } from "micro";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan; // 'monthly' | 'yearly'
      if (!userId) break;

      if (plan === "yearly") {
        const paidUntil = new Date();
        paidUntil.setFullYear(paidUntil.getFullYear() + 1);
        await supabaseAdmin.from("profiles").update({
          subscription_status: "active",
          plan: "yearly",
          paid_until: paidUntil.toISOString(),
        }).eq("id", userId);
      } else {
        await supabaseAdmin.from("profiles").update({
          subscription_status: "active",
          plan: "monthly",
        }).eq("id", userId);
      }
      break;
    }

    // Fires when the customer cancels their own monthly subscription
    // (including via the self-service Billing Portal).
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const userId = customer.metadata?.userId;
      if (userId) {
        await supabaseAdmin.from("profiles").update({ subscription_status: "canceled" }).eq("id", userId);
      }
      break;
    }

    default:
      break;
  }

  res.status(200).json({ received: true });
}
