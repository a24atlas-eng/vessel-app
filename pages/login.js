import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.query.ref) {
      sessionStorage.setItem("vessel_ref", router.query.ref);
      setMode("signup");
    }
  }, [router.query.ref]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{mode === "signin" ? "Sign In" : "Create Account"}</h1>

        <button type="button" onClick={signInWithGoogle} style={styles.googleBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.btn} disabled={loading}>{loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}</button>
        <button type="button" style={styles.switchBtn} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#241a42,#9c4d7c,#f2ad83)" },
  card: { background: "rgba(10,6,20,0.65)", padding: 32, borderRadius: 16, width: 340, display: "flex", flexDirection: "column", gap: 12 },
  title: { color: "#fff", fontFamily: "sans-serif", marginBottom: 4, textAlign: "center" },
  googleBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 10, borderRadius: 8, border: "1px solid #4a3a5e", background: "#fff", color: "#1a1a1a", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "2px 0" },
  dividerLine: { flex: 1, height: 1, background: "#4a3a5e" },
  dividerText: { fontSize: 11, color: "#c9bcd6" },
  input: { padding: 10, borderRadius: 8, border: "1px solid #4a3a5e", background: "rgba(255,255,255,0.05)", color: "#fff" },
  btn: { padding: 10, borderRadius: 8, border: "none", background: "#ff8fd0", color: "#1a0f2e", fontWeight: 700, cursor: "pointer" },
  switchBtn: { background: "none", border: "none", color: "#c9bcd6", fontSize: 12, cursor: "pointer" },
  error: { color: "#ff8f8f", fontSize: 13 },
};
