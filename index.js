import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "linear-gradient(180deg,#241a42,#9c4d7c,#f2ad83)", color: "#fff", fontFamily: "sans-serif" }}>
      <h1>VESSEL</h1>
      <p>пространство для того, кем ты себя знаешь</p>
      <Link href="/login" style={{ padding: "10px 24px", borderRadius: 20, background: "#fff", color: "#241a42", textDecoration: "none", fontWeight: 700 }}>
        Начать
      </Link>
    </div>
  );
}
