import Link from "next/link";

export default function Home() {
  return (
    <div style={styles.page}>
      <div className="glowBg" />

      <header style={styles.header}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#d4b8ff" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="2" fill="#d4b8ff" />
          <line x1="12" y1="1" x2="12" y2="5" stroke="#d4b8ff" strokeWidth="1.3" />
        </svg>
        <span style={styles.logoText}>EARTH SIMULATOR</span>
      </header>

      <main style={styles.main}>
        <div style={styles.textCol}>
          <div style={styles.eyebrow}>Welcome to</div>
          <h1 style={styles.title}>Earth Simulator</h1>
          <div style={styles.divider} />
          <p style={styles.tagline}>Build your avatar. Set your goals. Program your core.</p>
          <p style={styles.subtext}>Define who you want to become in this simulation game.</p>
          <Link href="/login" style={styles.cta}>
            <span style={styles.ctaIcon}>✦</span>
            <span>ENTER THE SIMULATOR</span>
            <span style={styles.ctaArrow}>→</span>
          </Link>
        </div>

        <div style={styles.imgCol}>
          <div style={styles.stageGlow} />
          <img src="/avatars/female.jpg" alt="Vessel avatar" style={styles.heroImg} />
        </div>
      </main>

      <style>{`
        .glowBg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 75% 30%, rgba(255,150,220,0.18), transparent 45%),
            radial-gradient(circle at 20% 80%, rgba(120,140,255,0.15), transparent 50%);
          pointer-events: none;
        }
        @media (min-width: 860px) {
          .heroRow { flex-direction: row !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "linear-gradient(180deg, #0c0a1f 0%, #241a42 40%, #6b3466 70%, #d9724f 100%)",
    color: "#fff",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "28px 32px 40px",
    display: "flex",
    flexDirection: "column",
  },
  header: { display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 2 },
  logoText: { fontSize: 14, letterSpacing: 4, fontWeight: 600, color: "#f0e6ff" },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    maxWidth: 640,
    margin: "0 auto",
  },
  textCol: { display: "flex", flexDirection: "column", alignItems: "center" },
  eyebrow: { fontSize: 22, color: "#e8dcff", fontWeight: 300 },
  title: { fontSize: 52, fontWeight: 800, margin: "4px 0 12px", textShadow: "0 0 30px rgba(216,180,255,0.5)" },
  divider: { width: 60, height: 2, background: "linear-gradient(90deg,#c98fff,#ff8fc8)", marginBottom: 20, borderRadius: 2 },
  tagline: { fontSize: 17, fontWeight: 700, marginBottom: 6 },
  subtext: { fontSize: 14, color: "#d9cdea", marginBottom: 28 },
  cta: {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "14px 30px", borderRadius: 30,
    background: "linear-gradient(90deg, #d9376e, #7c5cff)",
    color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 1,
    textDecoration: "none",
  },
  ctaIcon: { opacity: 0.9 },
  ctaArrow: { fontSize: 16 },
  imgCol: { position: "relative", width: 220, marginTop: 10 },
  stageGlow: {
    position: "absolute", inset: "-20px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(217,180,255,0.35), transparent 70%)",
    filter: "blur(10px)",
  },
  heroImg: { position: "relative", width: "100%", borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" },
};
