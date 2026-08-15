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

  const setStatus = async (userId, status) => {
    if (!userId) return;
    await supabaseAdmin.from("profiles").update({ subscription_status: status }).eq("id", userId);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await setStatus(session.metadata?.userId, "active");
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      await setStatus(customer.metadata?.userId, "canceled");
      break;
    }
    default:
      break;
  }

  res.status(200).json({ received: true });
}
