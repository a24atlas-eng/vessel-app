import { useEffect, useState } from "react";
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

  const addItem = async (table, list, setList, label) => {
    if (!isPaid && list.length >= FREE_LIMIT) {
      alert(`На бесплатном тарифе доступно только ${FREE_LIMIT}. Оформи подписку, чтобы добавлять без ограничений.`);
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

  const setGender = async (g) => {
    setProfile({ ...profile, gender: g });
    await supabase.from("profiles").update({ gender: g }).eq("id", user.id);
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const path = `${user.id}/photo.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return alert("Не удалось загрузить фото: " + upErr.message);
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
    return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div style={styles.loadingPage}>Загрузка…</div>;

  const stageImg = profile?.avatar_url || AVATAR_IMG[profile?.gender || "vessel_a"];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>EARTH SIMULATOR</div>
        <nav style={styles.nav}>
          <span style={styles.navActive}>AVATAR</span>
          <span style={styles.navItem}>CORE PROGRAMS</span>
          <span style={styles.navItem}>GOALS</span>
        </nav>
        <div style={styles.accountRow}>
          <div style={styles.avatarDot} />
          <span>{profile?.display_name || "Player"}</span>
          {isPaid && <span style={styles.premiumBadge}>PREMIUM</span>}
        </div>
      </header>

      <main style={styles.mainGrid} data-vessel-grid>
        <Panel title="CORE PROGRAMS" subtitle="Who do you want to become?" hint="Adjust the percentage of each program to define your ideal self.">
          {programs.map((i) => (
            <SliderRow key={i.id} item={i} onChange={(v) => updateValue("core_programs", i.id, v, programs, setPrograms)} onRemove={() => removeItem("core_programs", i.id, programs, setPrograms)} />
          ))}
          <AddRow onAdd={(label) => addItem("core_programs", programs, setPrograms, label)} label="ADD PROGRAM" />
          {!isPaid && <div style={styles.limitNote}>{programs.length}/{FREE_LIMIT} бесплатно</div>}
        </Panel>

        <div style={styles.stageCol}>
          <div style={styles.stageCard}>
            <img src={stageImg} alt="avatar" style={styles.stageImg} />
          </div>
        </div>

        <Panel title="GOALS" subtitle="What does your player want to experience?" hint="Add your goals and track your progress.">
          {goals.map((i) => (
            <ProgressRow key={i.id} item={i} onChange={(v) => updateValue("goals", i.id, v, goals, setGoals)} onRemove={() => removeItem("goals", i.id, goals, setGoals)} />
          ))}
          <AddRow onAdd={(label) => addItem("goals", goals, setGoals, label)} label="ADD GOAL" />
          {!isPaid && <div style={styles.limitNote}>{goals.length}/{FREE_LIMIT} бесплатно</div>}
        </Panel>
      </main>

      <section style={styles.bottomGrid} data-vessel-bottom>
        <div style={styles.chooseCard}>
          <div style={styles.panelTitle}>CHOOSE YOUR AVATAR</div>
          <div style={styles.panelSub}>Select your avatar base</div>
          <div style={styles.avatarChoiceRow}>
            {["vessel_a", "vessel_b"].map((g) => (
              <button key={g} onClick={() => setGender(g)} style={{ ...styles.avatarChoiceCard, borderColor: profile?.gender === g ? "#7c3aed" : "#e4e0f0" }}>
                <img src={AVATAR_IMG[g]} alt="" style={styles.avatarThumb} />
                <span>{g === "vessel_a" ? "FEMALE AVATAR" : "MALE AVATAR"}</span>
                <span style={{ ...styles.radio, background: profile?.gender === g ? "#7c3aed" : "transparent" }} />
              </button>
            ))}
          </div>
        </div>

        <div style={styles.ctaCard}>
          <div style={{ ...styles.panelTitle, color: "#7c3aed" }}>YOUR AVATAR IS YOU</div>
          <p style={styles.ctaText}>Your avatar is a reflection of your inner programs and your goals.</p>
          <p style={styles.ctaText}>Design it. Program it. Activate it.</p>
          <p style={styles.ctaBold}>You are the player. Your life is the game.</p>

          <label style={styles.uploadBtn}>
            Загрузить своё фото
            <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files[0])} style={{ display: "none" }} />
          </label>

          {profile?.avatar_url && (
            <div style={styles.photoSaveBlock}>
              {profile?.photo_saved_at && (
                <div style={styles.photoDate}>Сохранено: {formatDate(profile.photo_saved_at)}</div>
              )}
              <button style={styles.downloadBtn} onClick={downloadPhoto}>Save and download photo of your avatar</button>
            </div>
          )}

          {!isPaid ? (
            <div style={styles.planRow}>
              <button style={styles.activateBtn} onClick={() => goCheckout("monthly")}>ПОДПИСКА — €4.99/МЕС</button>
              <button style={styles.activateBtnAlt} onClick={() => goCheckout("yearly")}>КУПИТЬ НА ГОД — €49 (разово)</button>
            </div>
          ) : (
            <div style={styles.planRow}>
              <button style={styles.activateBtn} onClick={() => alert("Активировано")}>ACTIVATE AVATAR</button>
              {profile?.plan === "monthly" && (
                <button style={styles.manageBtn} onClick={goManageBilling}>Управлять подпиской / отменить</button>
              )}
            </div>
          )}
        </div>
      </section>

      <button style={styles.logout} onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}>Выйти</button>
    </div>
  );
}

function Panel({ title, subtitle, hint, children }) {
  return (
    <div style={styles.sidePanel}>
      <div style={styles.panelTitle}>{title}</div>
      <div style={styles.panelSub}>{subtitle}</div>
      <div style={styles.panelHint}>{hint}</div>
      <div style={{ marginTop: 16 }}>{children}</div>
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
      <button onClick={onRemove} style={styles.rowRemove}>убрать</button>
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
      <button onClick={onRemove} style={styles.rowRemove}>убрать</button>
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
  navActive: { color: PURPLE, borderBottom: `2px solid ${PURPLE}`, paddingBottom: 4 },
  navItem: { color: "#8a83a3" },
  accountRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  avatarDot: { width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #ec4899)` },
  premiumBadge: { fontSize: 10, background: PURPLE, color: "#fff", padding: "2px 8px", borderRadius: 10 },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  sidePanel: { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  panelTitle: { fontWeight: 800, fontSize: 16, marginBottom: 4 },
  panelSub: { fontSize: 13, color: "#4a4360", marginBottom: 4 },
  panelHint: { fontSize: 11, color: "#8a83a3", lineHeight: 1.4 },
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
  stageCol: { display: "flex", justifyContent: "center" },
  stageCard: { borderRadius: 20, overflow: "hidden", width: "100%", maxWidth: 420, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" },
  stageImg: { width: "100%", display: "block" },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 },
  chooseCard: { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  avatarChoiceRow: { display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" },
  avatarChoiceCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12, borderRadius: 12, border: "1.5px solid", background: "#faf9fe", cursor: "pointer", fontSize: 11, fontWeight: 700, width: 120 },
  avatarThumb: { width: 60, height: 100, objectFit: "cover", borderRadius: 8 },
  radio: { width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${PURPLE}` },
  ctaCard: { background: "#f4f0fd", borderRadius: 16, padding: 20 },
  ctaText: { fontSize: 13, color: "#4a4360", marginBottom: 6 },
  ctaBold: { fontSize: 13, fontWeight: 700, marginBottom: 14 },
  uploadBtn: { display: "inline-block", padding: "8px 16px", borderRadius: 20, border: `1px solid ${PURPLE}`, color: PURPLE, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  photoSaveBlock: { marginBottom: 14 },
  photoDate: { fontSize: 11, color: "#8a83a3", marginBottom: 6 },
  downloadBtn: { width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontSize: 11, fontWeight: 700, cursor: "pointer" },
  planRow: { display: "flex", flexDirection: "column", gap: 8 },
  activateBtnAlt: { display: "block", width: "100%", padding: 12, borderRadius: 12, border: `1.5px solid ${PURPLE}`, background: "#fff", color: PURPLE, fontWeight: 800, fontSize: 12, cursor: "pointer" },
  manageBtn: { display: "block", width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d8d2ea", background: "none", color: "#8a83a3", fontWeight: 600, fontSize: 11, cursor: "pointer" },
  activateBtn: { display: "block", width: "100%", padding: 14, borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${PURPLE}, #ec4899)`, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" },
  logout: { marginTop: 24, background: "none", border: "none", color: "#b0a9c4", fontSize: 12, cursor: "pointer" },
};
