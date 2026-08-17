import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { newUserId, refCode } = req.body;
    if (!refCode || refCode === newUserId) return res.status(200).json({ applied: false });

    // refCode is simply the referrer's own user id (their share link is /login?ref=<their id>)
    const { data: referrer } = await supabaseAdmin
      .from("profiles")
      .select("id, bonus_slots")
      .eq("id", refCode)
      .single();

    if (!referrer) return res.status(200).json({ applied: false });

    const { data: newProfile } = await supabaseAdmin
      .from("profiles")
      .select("referred_by")
      .eq("id", newUserId)
      .single();

    // Only ever apply once per new user.
    if (newProfile?.referred_by) return res.status(200).json({ applied: false });

    await supabaseAdmin.from("profiles").update({ referred_by: refCode }).eq("id", newUserId);
    await supabaseAdmin.from("profiles").update({ bonus_slots: (referrer.bonus_slots || 0) + 1 }).eq("id", refCode);

    res.status(200).json({ applied: true });
  } catch (err) {
    console.error("apply-referral error:", err);
    res.status(500).json({ error: err.message });
  }
}
