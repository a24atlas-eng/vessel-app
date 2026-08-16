import Link from "next/link";

export default function Home() {
  return (
    <Link href="/login" style={styles.wrap} aria-label="Enter the Simulator">
      <picture>
        <source media="(min-width: 760px)" srcSet="/hero-desktop.jpg" />
        <img src="/hero-mobile.jpg" alt="Welcome to Earth Simulator" style={styles.img} />
      </picture>
    </Link>
  );
}

const styles = {
  wrap: {
    display: "block",
    width: "100%",
    minHeight: "100vh",
    cursor: "pointer",
    lineHeight: 0,
  },
  img: {
    width: "100%",
    height: "auto",
    display: "block",
  },
};
