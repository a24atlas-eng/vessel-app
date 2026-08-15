import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  return (
    <div style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{mode === "signin" ? "Вход" : "Регистрация"}</h1>
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={styles.input} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.btn} disabled={loading}>{loading ? "..." : mode === "signin" ? "Войти" : "Создать аккаунт"}</button>
        <button type="button" style={styles.switchBtn} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#241a42,#9c4d7c,#f2ad83)" },
  card: { background: "rgba(10,6,20,0.6)", padding: 32, borderRadius: 16, width: 320, display: "flex", flexDirection: "column", gap: 12 },
  title: { color: "#fff", fontFamily: "sans-serif", marginBottom: 8 },
  input: { padding: 10, borderRadius: 8, border: "1px solid #4a3a5e", background: "rgba(255,255,255,0.05)", color: "#fff" },
  btn: { padding: 10, borderRadius: 8, border: "none", background: "#ff8fd0", color: "#1a0f2e", fontWeight: 700, cursor: "pointer" },
  switchBtn: { background: "none", border: "none", color: "#c9bcd6", fontSize: 12, cursor: "pointer" },
  error: { color: "#ff8f8f", fontSize: 13 },
};
