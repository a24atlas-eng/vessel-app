import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const FREE_LIMIT_BASE = 3;
const MAX_PIN_PROGRAMS = 12;
const MAX_PIN_GOALS = 3;
const MEMORIES_FREE_LIMIT = 3;
const AVATAR_IMG = { vessel_a: "/avatars/female.jpg", vessel_b: "/avatars/male.jpg" };
const PURPLE = "#a855f7";

// Two concentric "rings" of slots around the avatar: an outer ring (0-5) and
// an inner ring closer to the body (6-11), for up to 12 pinned programs.
const SLOTS = [
  { x: 50, y: 9, align: "center" },   // 0 outer top apex, near the crystal
  { x: 20, y: 19, align: "left" },    // 1 outer upper-left
  { x: 80, y: 19, align: "right" },   // 2 outer upper-right
  { x: 9, y: 38, align: "left" },     // 3 outer mid-left
  { x: 91, y: 38, align: "right" },   // 4 outer mid-right
  { x: 50, y: 80, align: "center" },  // 5 outer bottom, near pedestal
  { x: 38, y: 26, align: "right" },   // 6 inner upper-left (near collar)
  { x: 62, y: 26, align: "left" },    // 7 inner upper-right (near collar)
  { x: 27, y: 49, align: "right" },   // 8 inner mid-left (near shoulder/arm)
  { x: 73, y: 49, align: "left" },    // 9 inner mid-right (near shoulder/arm)
  { x: 35, y: 62, align: "right" },   // 10 inner lower-left (near waist)
  { x: 65, y: 62, align: "left" },    // 11 inner lower-right (near waist)
];
const SLOT_LINES = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 2], [1, 3], [2, 4], [3, 5], [4, 5],
  [0, 6], [0, 7], [6, 7], [1, 6], [2, 7],
  [6, 8], [7, 9], [3, 8], [4, 9], [8, 9],
  [8, 10], [9, 11], [10, 11], [5, 10], [5, 11],
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [goals, setGoals] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameDraft, setNameDraft] = useState("");
  const [onboardGender, setOnboardGender] = useState("vessel_a");
  const [view, setView] = useState("avatar"); // avatar | core | goals | memories | pro
  const [showProgress, setShowProgress] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUser(user);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, []);

  const loadAll = async (uid) => {
    const [{ data: p }, { data: cp }, { data: g }, { data: m }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("core_programs").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("goals").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("memories").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    setProfile(p);
    setPrograms(cp || []);
    setGoals(g || []);
    setMemories(m || []);
  };

  const isPaid = profile?.subscription_status === "active" || (profile?.paid_until && new Date(profile.paid_until) > new Date());
  const needsOnboarding = profile && !profile.display_name;
  const freeLimit = FREE_LIMIT_BASE + (profile?.bonus_slots || 0);

  const addItem = async (table, list, setList, label) => {
    if (!isPaid && list.length >= freeLimit) {
      alert(`Free plan allows ${freeLimit}. Invite a friend for +1, or upgrade to Pro for unlimited.`);
      setView("pro");
      return;
    }
    const { data, error } = await supabase
      .from(table)
      .insert({ user_id: user.id, label, value: table === "goals" ? 0 : 50 })
      .select()
      .single();
    if (!error) setList([...list, data]);
  };

  const removeItem = async (table, id, list, setList) => {
    await supabase.from(table).delete().eq("id", id);
    setList(list.filter((i) => i.id !== id));
  };

  const updateValue = async (table, id, value, list, setList) => {
    setList(list.map((i) => (i.id === id ? { ...i, value } : i)));
    await supabase.from(table).update({ value }).eq("id", id);
  };

  const logHistory = async (table, id, list) => {
    const item = list.find((i) => i.id === id);
    if (!item) return;
    await supabase.from("history").insert({
      user_id: user.id,
      kind: table === "goals" ? "goal" : "program",
      label: item.label,
      value: item.value,
    });
  };

  const togglePin = async (table, id, list, setList, max) => {
    const item = list.find((i) => i.id === id);
    const pinnedCount = list.filter((i) => i.pinned).length;
    if (!item.pinned && pinnedCount >= max) {
      alert(`You can pin up to ${max} on your avatar. Unpin one first.`);
      return;
    }
    const newPinned = !item.pinned;
    const pinnedAt = newPinned ? new Date().toISOString() : null;
    setList(list.map((i) => (i.id === id ? { ...i, pinned: newPinned, pinned_at: pinnedAt } : i)));
    await supabase.from(table).update({ pinned: newPinned, pinned_at: pinnedAt }).eq("id", id);
  };

  const goCheckout = async (plan) => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert("Checkout error: " + (data.error || res.status));
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      alert("Checkout error: " + err.message);
    }
  };

  const goManageBilling = async () => {
    const res = await fetch("/api/create-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const path = `${user.id}/photo.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return alert("Could not upload photo: " + upErr.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    const savedAt = new Date().toISOString();
    setProfile((p) => ({ ...p, avatar_url: url, photo_saved_at: savedAt }));
    await supabase.from("profiles").update({ avatar_url: url, photo_saved_at: savedAt }).eq("id", user.id);
  };

  const removePhoto = async () => {
    setProfile((p) => ({ ...p, avatar_url: null, photo_saved_at: null }));
    await supabase.from("profiles").update({ avatar_url: null, photo_saved_at: null }).eq("id", user.id);
  };

  const completeOnboarding = async () => {
    const name = nameDraft.trim();
    if (!name) return alert("Please enter a name.");
    const { error } = await supabase.from("profiles").update({ display_name: name, gender: onboardGender }).eq("id", user.id);
    if (error) {
      alert("Could not save your name: " + error.message);
      return;
    }
    const refCode = typeof window !== "undefined" ? sessionStorage.getItem("vessel_ref") : null;
    if (refCode) {
      try {
        await fetch("/api/apply-referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newUserId: user.id, refCode }),
        });
      } catch (e) {
        // non-critical, ignore
      }
      sessionStorage.removeItem("vessel_ref");
    }
    await loadAll(user.id);
  };

  const doActivate = () => {
    const el = document.getElementById("activate-flash");
    if (el) {
      el.style.transition = "none";
      el.style.opacity = "1";
      // Force the browser to apply the instant flash before we animate the fade-out.
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.85s ease-out";
        el.style.opacity = "0";
      });
    }
  };

  const addMemory = async (text) => {
    if (!isPaid && memories.length >= MEMORIES_FREE_LIMIT) {
      alert(`Free plan allows ${MEMORIES_FREE_LIMIT} memories. Upgrade to Pro to save unlimited memories.`);
      setView("pro");
      return;
    }
    const { data, error } = await supabase
      .from("memories")
      .insert({ user_id: user.id, text })
      .select()
      .single();
    if (!error) setMemories([data, ...memories]);
  };

  const removeMemory = async (id) => {
    await supabase.from("memories").delete().eq("id", id);
    setMemories(memories.filter((m) => m.id !== id));
  };

  const openProgress = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from("history")
      .select("value, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString())
      .order("created_at");
    setProgressData(data || []);
    setShowProgress(true);
  };

  if (loading) return <div style={styles.loadingPage}>Loading…</div>;

  const stageImg = profile?.avatar_url || AVATAR_IMG[profile?.gender || "vessel_a"];
  const pinnedPrograms = programs
    .filter((p) => p.pinned)
    .sort((a, b) => new Date(a.pinned_at || 0) - new Date(b.pinned_at || 0))
    .slice(0, MAX_PIN_PROGRAMS);
  const pinnedGoals = goals
    .filter((g) => g.pinned)
    .sort((a, b) => new Date(a.pinned_at || 0) - new Date(b.pinned_at || 0))
    .slice(0, MAX_PIN_GOALS);

  return (
    <div style={styles.page}>
      {needsOnboarding && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalTitle}>Name of the player</div>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Enter your name" style={styles.input} autoFocus />
            <div style={{ ...styles.modalTitle, marginTop: 16 }}>Choose your avatar</div>
            <div style={styles.avatarChoiceRow}>
              {["vessel_a", "vessel_b"].map((g) => (
                <button key={g} onClick={() => setOnboardGender(g)} style={{ ...styles.avatarChoiceCard, borderColor: onboardGender === g ? PURPLE : "#3a3252" }}>
                  <img src={AVATAR_IMG[g]} alt="" style={styles.avatarThumb} />
                  <span>{g === "vessel_a" ? "FEMALE" : "MALE"}</span>
                </button>
              ))}
            </div>
            <button style={{ ...styles.primaryBtn, marginTop: 20 }} onClick={completeOnboarding}>Continue</button>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.logoRow}>
          <Gem size={20} />
          <span style={styles.logoText}>EARTH SIMULATOR</span>
        </div>
        <div style={styles.accountRow}>
          <div style={styles.avatarDot} />
          <span>{profile?.display_name ? `Player ${profile.display_name}` : "Player"}</span>
        </div>
      </header>

      {view === "avatar" && (
        <AvatarView
          stageImg={stageImg}
          pinnedPrograms={pinnedPrograms}
          pinnedGoals={pinnedGoals}
          onActivate={doActivate}
          onOpenProgress={openProgress}
        />
      )}

      {view === "core" && (
        <ManageList
          title="CORE PROGRAMS"
          items={programs}
          onAdd={(label) => addItem("core_programs", programs, setPrograms, label)}
          onRemove={(id) => removeItem("core_programs", id, programs, setPrograms)}
          onChange={(id, v) => updateValue("core_programs", id, v, programs, setPrograms)}
          onCommit={(id) => logHistory("core_programs", id, programs)}
          onPin={(id) => togglePin("core_programs", id, programs, setPrograms, MAX_PIN_PROGRAMS)}
          addLabel="ADD PROGRAM"
        />
      )}

      {view === "goals" && (
        <ManageList
          title="GOALS"
          items={goals}
          onAdd={(label) => addItem("goals", goals, setGoals, label)}
          onRemove={(id) => removeItem("goals", id, goals, setGoals)}
          onChange={(id, v) => updateValue("goals", id, v, goals, setGoals)}
          onCommit={(id) => logHistory("goals", id, goals)}
          onPin={(id) => togglePin("goals", id, goals, setGoals, MAX_PIN_GOALS)}
          addLabel="ADD GOAL"
        />
      )}

      {view === "memories" && (
        <MemoriesView
          items={memories}
          isPaid={isPaid}
          freeLimit={MEMORIES_FREE_LIMIT}
          onAdd={addMemory}
          onRemove={removeMemory}
        />
      )}

      {view === "pro" && (
        <ProView
          isPaid={isPaid}
          plan={profile?.plan}
          paidUntil={profile?.paid_until}
          onSubscribeMonthly={() => goCheckout("monthly")}
          onBuyYearly={() => goCheckout("yearly")}
          onManage={goManageBilling}
          referralLink={user ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${user.id}` : ""}
          bonusSlots={profile?.bonus_slots || 0}
        />
      )}

      {showProgress && (
        <ProgressModal history={progressData} onClose={() => setShowProgress(false)} />
      )}

      {(view === "core" || view === "goals") && (
        <div style={styles.settingsSection}>
          <SettingsRow title="Your photo" subtitle="Upload a custom photo for your avatar">
            <div style={styles.photoBtnRow}>
              <label style={styles.uploadBtn}>
                Upload
                <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files[0])} style={{ display: "none" }} />
              </label>
              {profile?.avatar_url && (
                <button style={styles.removeBtn} onClick={removePhoto}>Remove</button>
              )}
            </div>
          </SettingsRow>
          <div onClick={() => setShowAbout(true)}>
            <SettingsRow title="About Earth Simulator" subtitle="Learn more about the simulator and how it works" arrow />
          </div>
        </div>
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <button style={styles.logout} onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}>Log out</button>

      <BottomNav view={view} setView={setView} onActivate={doActivate} isPaid={isPaid} />
      <div id="activate-flash" style={styles.activateFlash} />
    </div>
  );
}

function AvatarView({ stageImg, pinnedPrograms, pinnedGoals, onActivate, onOpenProgress }) {
  return (
    <div style={styles.stageWrap}>
      <div style={styles.bob}><Gem size={44} /></div>

      <div style={styles.stageCard}>
        <img src={stageImg} alt="avatar" style={styles.stageImg} />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.constellationSvg}>
          {SLOT_LINES.filter(([a, b]) => a < pinnedPrograms.length && b < pinnedPrograms.length).map(([a, b], i) => (
            <line key={i} x1={SLOTS[a].x} y1={SLOTS[a].y} x2={SLOTS[b].x} y2={SLOTS[b].y} stroke="rgba(216,180,255,0.4)" strokeWidth="0.25" />
          ))}
        </svg>

        {pinnedPrograms.map((p, i) => (
          <div key={`node-${p.id}`} style={{ position: "absolute", left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, transform: "translate(-50%, -50%)", ...styles.slotNode }} />
        ))}

        {pinnedPrograms.map((p, i) => {
          const slot = SLOTS[i];
          return (
            <div key={p.id} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: `translate(${slot.align === "left" ? "-2%" : slot.align === "right" ? "-98%" : "-50%"}, -50%)`, textAlign: slot.align, minWidth: 90 }}>
              <div style={styles.slotBadge}>
                <div style={styles.slotLabel}>{p.label}</div>
                <div style={styles.slotValue}>{p.value}%</div>
              </div>
            </div>
          );
        })}
        {pinnedGoals.length > 0 && (
          <div style={styles.pinnedGoalsOverlay}>
            {pinnedGoals.map((g) => (
              <div key={g.id} style={styles.goalOrb}>
                <div style={styles.goalOrbValue}>{g.value}%</div>
                <div style={styles.goalOrbLabel}>{g.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button style={styles.activateControl} onClick={onActivate}>
        <Gem size={30} />
        <span style={styles.activateLabel}>ACTIVATE</span>
      </button>

      <span style={styles.progressLink} onClick={onOpenProgress}>View progress</span>
    </div>
  );
}

function ProgressModal({ history, onClose }) {
  // Average value per day, over the last 30 days.
  const byDay = {};
  history.forEach((h) => {
    const day = h.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(h.value);
  });
  const days = Object.keys(byDay).sort();
  const points = days.map((d) => byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length);

  const w = 300, h = 140, pad = 10;
  const path = points.length > 1
    ? points.map((v, i) => {
        const x = pad + (i / (points.length - 1)) * (w - pad * 2);
        const y = h - pad - (v / 100) * (h - pad * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ")
    : "";

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Your progress · last 30 days</div>
        {points.length > 1 ? (
          <svg width={w} height={h} style={{ display: "block", margin: "10px 0" }}>
            <path d={path} fill="none" stroke="#c084fc" strokeWidth="2" />
          </svg>
        ) : (
          <p style={styles.proTextMuted}>Adjust a slider and come back — your trend will show up here.</p>
        )}
        <button style={styles.manageBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function ManageList({ title, items, onAdd, onRemove, onChange, onCommit, onPin, addLabel }) {
  const [draft, setDraft] = useState("");
  return (
    <div style={styles.managePanel}>
      <div style={styles.manageTitle}>{title}</div>
      <p style={styles.pinHint}>Tap the star to pin it to your avatar.</p>
      {items.map((i) => (
        <div key={i.id} style={styles.manageRow}>
          <div style={styles.manageRowTop}>
            <span style={styles.manageLabel}>{i.label}</span>
            <span style={styles.manageValue}>{i.value}%</span>
            <span onClick={() => onPin(i.id)} style={styles.pinStar}>{i.pinned ? "★" : "☆"}</span>
          </div>
          <input
            type="range" min="0" max="100" value={i.value}
            onChange={(e) => onChange(i.id, Number(e.target.value))}
            onMouseUp={() => onCommit(i.id)}
            onTouchEnd={() => onCommit(i.id)}
            style={styles.rangeInput}
          />
          <button onClick={() => onRemove(i.id)} style={styles.removeLink}>remove</button>
        </div>
      ))}
      <div style={styles.addRow}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={addLabel} style={styles.addInput} />
        <button onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }} style={styles.addBtn}>+ {addLabel}</button>
      </div>
    </div>
  );
}

function MemoriesView({ items, isPaid, freeLimit, onAdd, onRemove }) {
  const [draft, setDraft] = useState("");
  const atLimit = !isPaid && items.length >= freeLimit;
  return (
    <div style={styles.managePanel}>
      <div style={styles.manageTitle}>MEMORIES</div>
      <p style={styles.pinHint}>Memories you want to remember and come back to.</p>

      <div style={styles.addRow}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a moment worth remembering…"
          style={styles.addInput}
        />
        <button
          onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }}
          style={styles.addBtn}
        >
          + ADD MEMORY
        </button>
      </div>

      {!isPaid && (
        <p style={{ ...styles.pinHint, marginTop: -6 }}>
          {items.length}/{freeLimit} free memories used{atLimit ? " — upgrade to Pro for unlimited." : "."}
        </p>
      )}

      {items.map((m) => (
        <div key={m.id} style={styles.manageRow}>
          <div style={styles.manageRowTop}>
            <span style={{ ...styles.manageLabel, whiteSpace: "normal", lineHeight: 1.4 }}>{m.text}</span>
          </div>
          <div style={{ fontSize: 11, color: "#8a80a8", marginTop: 2 }}>
            {new Date(m.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </div>
          <button onClick={() => onRemove(m.id)} style={styles.removeLink}>remove</button>
        </div>
      ))}

      {items.length === 0 && (
        <p style={styles.pinHint}>No memories yet — write your first one above.</p>
      )}
    </div>
  );
}

function ProView({ isPaid, plan, paidUntil, onSubscribeMonthly, onBuyYearly, onManage, referralLink, bonusSlots }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Earth Simulator", url: referralLink }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div style={styles.managePanel}>
      <div style={styles.manageTitle}>PRO</div>
      {isPaid ? (
        <>
          <p style={styles.proText}>You're on the {plan === "yearly" ? "Yearly" : "Monthly"} plan.</p>
          {plan === "yearly" && paidUntil && <p style={styles.proTextMuted}>Active until {new Date(paidUntil).toLocaleDateString("en-GB")}.</p>}
          {plan === "monthly" && <button style={styles.manageBtn} onClick={onManage}>Manage subscription / cancel</button>}
        </>      ) : (
        <>
          <p style={styles.proText}>Unlock unlimited Core Programs and Goals.</p>
          <button style={styles.primaryBtn} onClick={onSubscribeMonthly}>SUBSCRIBE — €4.99/MONTH</button>
          <button style={styles.secondaryBtn} onClick={onBuyYearly}>BUY YEARLY — €49 (one-time)</button>

          <div style={styles.inviteBox}>
            <div style={styles.inviteTitle}>Invite a friend</div>
            <p style={styles.proTextMuted}>Get +1 free slot for every friend who joins. {bonusSlots > 0 && `You've earned ${bonusSlots} so far.`}</p>
            <button style={styles.secondaryBtn} onClick={share}>{copied ? "Link copied!" : "Share invite link"}</button>
          </div>
        </>
      )}
    </div>
  );
}

function AboutModal({ onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>About Earth Simulator</div>
        <p style={styles.proText}>
          Earth Simulator is a space for expanding awareness — a playful way to reflect on who
          you are and who you want to become.
        </p>
        <p style={styles.proText}>
          Customize your avatar, track your inner programs and goals, and use it as a mirror
          for building a better version of your reality.
        </p>
        <p style={styles.proTextMuted}>
          Note: this is a metaphor, intended for reflection and entertainment — not a literal
          simulation.
        </p>
        <button style={styles.manageBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function SettingsRow({ title, subtitle, children, arrow }) {
  return (
    <div style={styles.settingsRow}>
      <div>
        <div style={styles.settingsTitle}>{title}</div>
        <div style={styles.settingsSub}>{subtitle}</div>
      </div>
      {children}
      {arrow && <span style={styles.settingsArrow}>›</span>}
    </div>
  );
}

function BottomNav({ view, setView, onActivate, isPaid }) {
  const items = [
    { key: "memories", label: "MEMORIES", icon: <span style={{ fontSize: 16 }}>✧</span> },
    { key: "core", label: "CORE", icon: <span style={{ fontSize: 16 }}>≡</span> },
    { key: "avatar", label: "AVATAR", icon: <Gem size={20} /> },
    { key: "goals", label: "GOALS", icon: <span style={{ fontSize: 16 }}>◎</span> },
    { key: "pro", label: "PRO", icon: <LockIcon locked={!isPaid} /> },
  ];
  return (
    <nav style={styles.bottomNav}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => (it.isAction ? onActivate() : setView(it.key))}
          style={{ ...styles.navBtn, color: view === it.key ? PURPLE : "#8a80a8" }}
        >
          {it.icon}
          <span style={styles.navBtnLabel}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

function LockIcon({ locked }) {
  return (
    <svg width="16" height="18" viewBox="0 0 24 26" fill="none">
      <rect x="4" y="11" width="16" height="13" rx="3" stroke="#e8dcff" strokeWidth="1.6" />
      {locked ? (
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#e8dcff" strokeWidth="1.6" fill="none" />
      ) : (
        <path d="M8 11V8a4 4 0 0 1 7-2.6" stroke="#e8dcff" strokeWidth="1.6" fill="none" />
      )}
      <circle cx="12" cy="17.5" r="1.6" fill="#e8dcff" />
    </svg>
  );
}

function Gem({ size = 24 }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 42 52">
      <defs>
        <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8fd0" />
          <stop offset="100%" stopColor="#9fd4ff" />
        </linearGradient>
        <filter id="gemGlowF" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points="21,2 40,26 21,50 2,26" fill="none" stroke="url(#gemGrad)" strokeWidth="1.6" filter="url(#gemGlowF)" />
      <polygon points="21,14 30,26 21,38 12,26" fill="url(#gemGrad)" opacity="0.9" />
    </svg>
  );
}

const styles = {
  loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#e8dcff", background: "#1a1030" },
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#160c2c,#241a42 40%,#5a2f5e 75%,#a85b60 100%)", color: "#f0eaff", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 90 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 10px" },
  logoRow: { display: "flex", alignItems: "center", gap: 8 },
  logoText: { fontSize: 12, letterSpacing: 2, fontWeight: 700 },
  accountRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  avatarDot: { width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #ec4899)` },

  stageWrap: { padding: "6px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  bob: { marginBottom: -6, zIndex: 2, animation: "bob 4s ease-in-out infinite" },
  stageCard: { position: "relative", width: "100%", maxWidth: 420, borderRadius: 20, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" },
  stageImg: { width: "100%", display: "block" },
  constellationSvg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  slotNode: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "radial-gradient(circle, #f3e8ff 0%, #c084fc 55%, rgba(168,85,247,0) 75%)",
    boxShadow: "0 0 6px 2px rgba(192,132,252,0.9), 0 0 14px 4px rgba(168,85,247,0.5)",
    zIndex: 1,
  },
  slotBadge: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4px 10px",
  },
  slotLabel: { fontSize: 10.5, letterSpacing: 0.5, color: "#f6f0ff", textShadow: "0 0 8px rgba(216,180,255,0.9), 0 0 3px rgba(0,0,0,0.6)", textAlign: "center", textTransform: "uppercase" },
  slotValue: { fontSize: 12.5, fontWeight: 800, color: "#ffffff", textShadow: "0 0 10px rgba(216,180,255,1), 0 0 3px rgba(0,0,0,0.6)", textAlign: "center" },

  pinnedGoalsOverlay: { position: "absolute", left: 0, right: 0, bottom: "9%", display: "flex", justifyContent: "space-evenly", gap: 8, padding: "0 12px" },
  goalOrb: {
    width: 62, height: 62, borderRadius: "50%",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(192,132,252,0.35) 45%, rgba(120,60,200,0.25) 75%, transparent 100%)",
    border: "1px solid rgba(216,180,255,0.6)",
    boxShadow: "0 0 18px rgba(192,132,252,0.85), 0 0 4px rgba(255,255,255,0.6) inset",
  },
  goalOrbValue: { fontSize: 14, fontWeight: 900, color: "#fff", textShadow: "0 0 10px rgba(192,132,252,1)" },
  goalOrbLabel: { fontSize: 7, letterSpacing: 0.3, color: "#f0eaff", textAlign: "center", padding: "0 4px", lineHeight: 1.1, marginTop: 1, textTransform: "uppercase" },

  activateControl: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", marginTop: 18, cursor: "pointer" },
  activateLabel: { fontSize: 10, letterSpacing: 1.5, color: "#e8dcff", fontWeight: 700 },
  activateFlash: { position: "fixed", inset: 0, background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(224,192,255,0.85) 35%, rgba(168,85,247,0.5) 65%, transparent 85%)", pointerEvents: "none", opacity: 0, zIndex: 40 },
  progressLink: { display: "block", textAlign: "center", marginTop: 10, fontSize: 11, color: "#a89bc9", textDecoration: "underline", cursor: "pointer" },
  inviteBox: { marginTop: 24, paddingTop: 18, borderTop: "1px solid #3a3252" },
  inviteTitle: { fontWeight: 800, fontSize: 13, marginBottom: 6 },

  managePanel: { padding: "6px 20px 20px" },
  manageTitle: { fontWeight: 800, fontSize: 15, letterSpacing: 1, marginBottom: 6 },
  pinHint: { fontSize: 11, color: "#a89bc9", marginBottom: 14 },
  manageRow: { marginBottom: 16 },
  manageRowTop: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 },
  manageLabel: { flex: 1 },
  manageValue: { color: PURPLE, fontWeight: 700 },
  pinStar: { color: PURPLE, fontSize: 16, cursor: "pointer" },
  rangeInput: { width: "100%", accentColor: PURPLE },
  removeLink: { background: "none", border: "none", color: "#8a80a8", fontSize: 10, cursor: "pointer", padding: 0, marginTop: 2 },
  addRow: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  addInput: { padding: 10, borderRadius: 8, border: "1px solid #3a3252", background: "rgba(255,255,255,0.05)", color: "#f0eaff", fontSize: 13 },
  addBtn: { padding: 10, borderRadius: 10, border: `1px dashed ${PURPLE}`, background: "rgba(168,85,247,0.1)", color: PURPLE, fontSize: 12, fontWeight: 700, cursor: "pointer" },

  proText: { fontSize: 13, color: "#e8dcff", marginBottom: 10 },
  proTextMuted: { fontSize: 11, color: "#a89bc9", marginBottom: 10 },
  primaryBtn: { display: "block", width: "100%", padding: 14, borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${PURPLE}, #ec4899)`, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", marginBottom: 10 },
  secondaryBtn: { display: "block", width: "100%", padding: 12, borderRadius: 12, border: `1.5px solid ${PURPLE}`, background: "none", color: PURPLE, fontWeight: 800, fontSize: 12, cursor: "pointer" },
  manageBtn: { display: "block", width: "100%", padding: 10, borderRadius: 12, border: "1px solid #3a3252", background: "none", color: "#a89bc9", fontWeight: 600, fontSize: 11, cursor: "pointer" },

  settingsSection: { padding: "0 20px 10px" },
  settingsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 10, cursor: "pointer" },
  settingsTitle: { fontSize: 13, fontWeight: 700 },
  settingsSub: { fontSize: 11, color: "#a89bc9", marginTop: 2 },
  settingsArrow: { color: "#a89bc9", fontSize: 18 },
  uploadBtn: { padding: "6px 14px", borderRadius: 16, border: `1px solid ${PURPLE}`, color: PURPLE, fontSize: 11, fontWeight: 700, cursor: "pointer" },
  photoBtnRow: { display: "flex", gap: 8 },
  removeBtn: { padding: "6px 14px", borderRadius: 16, border: "1px solid #6b5f85", background: "none", color: "#a89bc9", fontSize: 11, fontWeight: 700, cursor: "pointer" },

  logout: { display: "block", margin: "10px auto", background: "none", border: "none", color: "#8a80a8", fontSize: 12, cursor: "pointer" },

  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-around", alignItems: "center", background: "rgba(15,9,28,0.92)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 6px calc(10px + env(safe-area-inset-bottom))", zIndex: 30 },
  navBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer" },
  navBtnLabel: { fontSize: 9, letterSpacing: 0.5, fontWeight: 700 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(10,6,20,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 },
  modalCard: { background: "#1e1436", borderRadius: 18, padding: 28, width: 340, maxWidth: "100%", border: "1px solid #3a3252" },
  modalTitle: { fontWeight: 800, fontSize: 14, marginBottom: 10, color: "#f0eaff" },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #3a3252", background: "rgba(255,255,255,0.05)", color: "#f0eaff", fontSize: 13, boxSizing: "border-box" },
  avatarChoiceRow: { display: "flex", gap: 12, marginTop: 8 },
  avatarChoiceCard: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12, borderRadius: 12, border: "1.5px solid", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#f0eaff" },
  avatarThumb: { width: 56, height: 90, objectFit: "cover", borderRadius: 8 },
};
