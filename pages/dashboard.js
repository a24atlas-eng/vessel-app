import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const FREE_LIMIT = 3;
const AVATAR_IMG = { vessel_a: "/avatars/female.jpg", vessel_b: "/avatars/male.jpg" };

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameDraft, setNameDraft] = useState("");
  const [onboardGender, setOnboardGender] = useState("vessel_a");
  const [showBilling, setShowBilling] = useState(false);

  const stageRef = useRef(null);
  const programsRef = useRef(null);
  const goalsRef = useRef(null);

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
    const [{ data: p }, { data: cp }, { data: g }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("core_programs").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("goals").select("*").eq("user_id", uid).order("created_at"),
    ]);
    setProfile(p);
    setPrograms(cp || []);
    setGoals(g || []);
  };

  const isPaid = profile?.subscription_status === "active" || (profile?.paid_until && new Date(profile.paid_until) > new Date());
  const needsOnboarding = profile && !profile.display_name;

  const addItem = async (table, list, setList, label) => {
    if (!isPaid && list.length >= FREE_LIMIT) {
      alert("You've reached the free limit of 3. Upgrade your plan to add more.");
      setShowBilling(true);
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

  const goCheckout = async (plan) => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email, plan }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
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

  const downloadPhoto = async () => {
    if (!profile?.avatar_url) return;
    const res = await fetch(profile.avatar_url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "vessel-avatar.jpg";
    link.click();
  };

  const formatDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const completeOnboarding = async () => {
    const name = nameDraft.trim();
    if (!name) return alert("Please enter a name.");
    setProfile((p) => ({ ...p, display_name: name, gender: onboardGender }));
    await supabase.from("profiles").update({ display_name: name, gender: onboardGender }).eq("id", user.id);
  };

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) return <div style={styles.loadingPage}>Loading…</div>;

  const stageImg = profile?.avatar_url || AVATAR_IMG[profile?.gender || "vessel_a"];

  return (
    <div style={styles.page}>
      {needsOnboarding && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalTitle}>Name of the player</div>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Enter your name"
              style={styles.input}
              autoFocus
            />
            <div style={{ ...styles.modalTitle, marginTop: 16 }}>Choose your avatar</div>
            <div style={styles.avatarChoiceRow}>
              {["vessel_a", "vessel_b"].map((g) => (
                <button
                  key={g}
                  onClick={() => setOnboardGender(g)}
                  style={{ ...styles.avatarChoiceCard, borderColor: onboardGender === g ? "#7c3aed" : "#e4e0f0" }}
                >
                  <img src={AVATAR_IMG[g]} alt="" style={styles.avatarThumb} />
                  <span>{g === "vessel_a" ? "FEMALE" : "MALE"}</span>
                  <span style={{ ...styles.radio, background: onboardGender === g ? "#7c3aed" : "transparent" }} />
                </button>
              ))}
            </div>
            <button style={{ ...styles.activateBtn, marginTop: 20 }} onClick={completeOnboarding}>Continue</button>
          </div>
        </div>
      )}

      {showBilling && (
        <div style={styles.modalOverlay} onClick={() => setShowBilling(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {isPaid ? (
              <>
                <div style={styles.modalTitle}>Your plan</div>
                <p style={styles.ctaText}>
                  You're on the {profile?.plan === "yearly" ? "yearly" : "monthly"} plan.
                  {profile?.plan === "yearly" && profile?.paid_until && (
                    <> Active until {formatDate(profile.paid_until)}.</>
                  )}
                </p>
                {profile?.plan === "monthly" && (
                  <button style={styles.manageBtn} onClick={goManageBilling}>Manage subscription / cancel</button>
                )}
                <button style={styles.closeModalBtn} onClick={() => setShowBilling(false)}>Close</button>
              </>
            ) : (
              <>
                <div style={styles.modalTitle}>Upgrade your plan</div>
                <p style={styles.ctaText}>Remove the 3-item limit on Core Programs and Goals.</p>
                <div style={styles.planRow}>
                  <button style={styles.activateBtn} onClick={() => goCheckout("monthly")}>SUBSCRIBE — €4.99/MONTH</button>
                  <button style={styles.activateBtnAlt} onClick={() => goCheckout("yearly")}>BUY YEARLY — €49 (one-time)</button>
                </div>
                <button style={styles.closeModalBtn} onClick={() => setShowBilling(false)}>Not now</button>
              </>
            )}
          </div>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.logo}>EARTH SIMULATOR</div>
        <nav style={styles.nav}>
          <span style={styles.navItem} onClick={() => scrollTo(stageRef)}>AVATAR</span>
          <span style={styles.navItem} onClick={() => scrollTo(programsRef)}>CORE PROGRAMS</span>
          <span style={styles.navItem} onClick={() => scrollTo(goalsRef)}>GOALS</span>
        </nav>
        <div style={styles.accountRow}>
          <div style={styles.avatarDot} />
          <span>{profile?.display_name || "Player"}</span>
          {isPaid ? (
            <button style={styles.premiumBadge} onClick={() => setShowBilling(true)}>PREMIUM</button>
          ) : (
            <button style={styles.upgradePill} onClick={() => setShowBilling(true)}>Upgrade Plan</button>
          )}
        </div>
      </header>

      <main style={styles.mainGrid} data-vessel-grid>
        <div ref={programsRef}>
          <Panel title="CORE PROGRAMS">
            <p style={styles.panelLine}><b>What programs does your avatar have?</b></p>
            <p style={styles.panelLine}>Choose what you want to strengthen.</p>
            <p style={styles.panelLineMuted}>Examples: Confidence · Focus · Discipline · Creativity · Calm</p>
            <p style={styles.panelLineMuted}>Set the intensity of each program.</p>

            <div style={{ marginTop: 14 }}>
              {programs.map((i) => (
                <SliderRow key={i.id} item={i} onChange={(v) => updateValue("core_programs", i.id, v, programs, setPrograms)} onRemove={() => removeItem("core_programs", i.id, programs, setPrograms)} />
              ))}
              <AddRow onAdd={(label) => addItem("core_programs", programs, setPrograms, label)} label="ADD PROGRAM" />
              {!isPaid && (
                <div style={styles.limitNote}>
                  {programs.length}/{FREE_LIMIT} free
                  {programs.length >= FREE_LIMIT && (
                    <> · <span style={styles.limitLink} onClick={() => setShowBilling(true)}>Upgrade your plan</span></>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div style={styles.stageCol} ref={stageRef}>
          <div style={styles.stageCard}>
            <img src={stageImg} alt="avatar" style={styles.stageImg} />
          </div>

          <div style={styles.photoUtilRow}>
            <label style={styles.uploadBtn}>
              Upload your photo
              <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files[0])} style={{ display: "none" }} />
            </label>
            {profile?.avatar_url && (
              <>
                {profile?.photo_saved_at && <div style={styles.photoDate}>Saved: {formatDate(profile.photo_saved_at)}</div>}
                <button style={styles.downloadBtn} onClick={downloadPhoto}>Download avatar photo</button>
              </>
            )}
          </div>
        </div>

        <div ref={goalsRef}>
          <Panel title="GOALS">
            <p style={styles.panelLine}><b>What does your player want to experience?</b></p>
            <p style={styles.panelLineMuted}>Add your goals and track your progress.</p>

            <div style={{ marginTop: 14 }}>
              {goals.map((i) => (
                <ProgressRow key={i.id} item={i} onChange={(v) => updateValue("goals", i.id, v, goals, setGoals)} onRemove={() => removeItem("goals", i.id, goals, setGoals)} />
              ))}
              <AddRow onAdd={(label) => addItem("goals", goals, setGoals, label)} label="ADD GOAL" />
              {!isPaid && (
                <div style={styles.limitNote}>
                  {goals.length}/{FREE_LIMIT} free
                  {goals.length >= FREE_LIMIT && (
                    <> · <span style={styles.limitLink} onClick={() => setShowBilling(true)}>Upgrade your plan</span></>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </main>

      <section style={styles.bottomGrid}>
        <div style={styles.ctaCard}>
          <div style={{ ...styles.panelTitle, color: "#7c3aed" }}>YOUR AVATAR IS YOU</div>
          <p style={styles.ctaText}>Your avatar is a reflection of your inner programs and your goals.</p>
          <p style={styles.ctaText}>Design it. Program it. Activate it.</p>
          <p style={styles.ctaBold}>You are the player. Your life is the game.</p>
          <button style={styles.activateBtn} onClick={() => alert("Activated")}>ACTIVATE AVATAR</button>
        </div>
      </section>

      <button style={styles.logout} onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}>Log out</button>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={styles.sidePanel}>
      <div style={styles.panelTitle}>{title}</div>
      {children}
    </div>
  );
}

function SliderRow({ item, onChange, onRemove }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowTop}>
        <span>{item.label}</span>
        <span>{item.value}%</span>
      </div>
      <div style={styles.sliderLine}>
        <input type="range" min="0" max="100" value={item.value} onChange={(e) => onChange(Number(e.target.value))} style={styles.rangeInput} />
      </div>
      <button onClick={onRemove} style={styles.rowRemove}>remove</button>
    </div>
  );
}

function ProgressRow({ item, onChange, onRemove }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowTop}>
        <span>{item.label}</span>
        <span>{item.value}%</span>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${item.value}%` }} />
      </div>
      <input type="range" min="0" max="100" value={item.value} onChange={(e) => onChange(Number(e.target.value))} style={styles.rangeInputHidden} />
      <button onClick={onRemove} style={styles.rowRemove}>remove</button>
    </div>
  );
}

function AddRow({ onAdd, label }) {
  const [draft, setDraft] = useState("");
  return (
    <div style={styles.addRow}>
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={label} style={styles.addInput} />
      <button onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }} style={styles.addBtn}>+ {label}</button>
    </div>
  );
}

const PURPLE = "#7c3aed";
const styles = {
  loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a3255" },
  page: { minHeight: "100vh", background: "#f4f2fb", fontFamily: "'Segoe UI', sans-serif", color: "#241f38", padding: "20px 24px 60px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  logo: { fontWeight: 800, fontSize: 15, letterSpacing: 1 },
  nav: { display: "flex", gap: 24, fontSize: 12, letterSpacing: 1, fontWeight: 600 },
  navItem: { color: "#6b6485", cursor: "pointer" },
  accountRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  avatarDot: { width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #ec4899)` },
  premiumBadge: { fontSize: 10, background: PURPLE, color: "#fff", padding: "3px 10px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700 },
  upgradePill: { fontSize: 10, background: "none", border: `1px solid ${PURPLE}`, color: PURPLE, padding: "3px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  sidePanel: { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  panelTitle: { fontWeight: 800, fontSize: 16, marginBottom: 10 },
  panelLine: { fontSize: 13, color: "#241f38", margin: "0 0 4px" },
  panelLineMuted: { fontSize: 11, color: "#8a83a3", margin: "0 0 4px", lineHeight: 1.4 },
  row: { marginBottom: 14 },
  rowTop: { display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 },
  sliderLine: { marginBottom: 2 },
  rangeInput: { width: "100%", accentColor: PURPLE },
  rangeInputHidden: { width: "100%", accentColor: PURPLE, marginTop: -4 },
  progressTrack: { height: 5, background: "#ece8f7", borderRadius: 4, overflow: "hidden", marginBottom: 2 },
  progressFill: { height: "100%", background: `linear-gradient(90deg, ${PURPLE}, #a855f7)` },
  rowRemove: { background: "none", border: "none", color: "#b0a9c4", fontSize: 10, cursor: "pointer", padding: 0 },
  addRow: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  addInput: { padding: 8, borderRadius: 8, border: "1px solid #e4e0f0", fontSize: 12 },
  addBtn: { padding: 10, borderRadius: 10, border: `1px dashed ${PURPLE}`, background: "#f4f0fd", color: PURPLE, fontSize: 12, fontWeight: 700, cursor: "pointer" },
  limitNote: { fontSize: 11, color: "#b0a9c4", marginTop: 8, textAlign: "center" },
  limitLink: { color: PURPLE, cursor: "pointer", fontWeight: 700 },
  stageCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, scrollMarginTop: 24 },
  stageCard: { borderRadius: 20, overflow: "hidden", width: "100%", maxWidth: 420, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" },
  stageImg: { width: "100%", display: "block" },
  photoUtilRow: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "100%", maxWidth: 300 },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 },
  avatarChoiceRow: { display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" },
  avatarChoiceCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12, borderRadius: 12, border: "1.5px solid", background: "#faf9fe", cursor: "pointer", fontSize: 11, fontWeight: 700, width: 110 },
  avatarThumb: { width: 56, height: 90, objectFit: "cover", borderRadius: 8 },
  radio: { width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${PURPLE}` },
  ctaCard: { background: "#f4f0fd", borderRadius: 16, padding: 20, textAlign: "center" },
  ctaText: { fontSize: 13, color: "#4a4360", marginBottom: 6 },
  ctaBold: { fontSize: 13, fontWeight: 700, marginBottom: 14 },
  uploadBtn: { display: "inline-block", padding: "8px 16px", borderRadius: 20, border: `1px solid ${PURPLE}`, color: PURPLE, fontSize: 12, fontWeight: 700, cursor: "pointer" },
  photoDate: { fontSize: 11, color: "#8a83a3" },
  downloadBtn: { width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontSize: 11, fontWeight: 700, cursor: "pointer" },
  planRow: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  activateBtnAlt: { display: "block", width: "100%", padding: 12, borderRadius: 12, border: `1.5px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontWeight: 800, fontSize: 12, cursor: "pointer" },
  manageBtn: { display: "block", width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d8d2ea", background: "none", color: "#8a83a3", fontWeight: 600, fontSize: 11, cursor: "pointer", marginTop: 10 },
  activateBtn: { display: "block", width: "100%", padding: 14, borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${PURPLE}, #ec4899)`, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 4 },
  logout: { marginTop: 24, background: "none", border: "none", color: "#b0a9c4", fontSize: 12, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(20,14,35,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 },
  modalCard: { background: "#fff", borderRadius: 18, padding: 28, width: 340, maxWidth: "100%" },
  modalTitle: { fontWeight: 800, fontSize: 14, marginBottom: 10 },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e4e0f0", fontSize: 13, boxSizing: "border-box" },
  closeModalBtn: { display: "block", width: "100%", padding: 10, marginTop: 10, background: "none", border: "none", color: "#8a83a3", fontSize: 12, cursor: "pointer" },
};
