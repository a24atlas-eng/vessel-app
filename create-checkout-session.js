import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId, email, plan } = req.body; // plan: 'monthly' | 'yearly'

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    customerId = customer.id;
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const isYearly = plan === "yearly";

  const session = await stripe.checkout.sessions.create({
    mode: isYearly ? "payment" : "subscription", // yearly = one-time payment, monthly = recurring subscription
    customer: customerId,
    line_items: [{ price: isYearly ? process.env.STRIPE_PRICE_ID_YEARLY : process.env.STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    metadata: { userId, plan: isYearly ? "yearly" : "monthly" },
  });

  res.status(200).json({ url: session.url });
}
