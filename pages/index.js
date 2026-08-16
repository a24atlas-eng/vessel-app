import Link from "next/link";

export default function Home() {
  return (
    <Link href="/login" style={styles.wrap} aria-label="Enter the Simulator">
      <img src="/hero-desktop.jpg" alt="Welcome to Earth Simulator" className="heroDesktop" style={styles.img} />
      <img src="/hero-mobile.jpg" alt="Welcome to Earth Simulator" className="heroMobile" style={styles.img} />

      <style>{`
        .heroMobile { display: block; }
        .heroDesktop { display: none; }
        @media (min-width: 760px) {
          .heroMobile { display: none; }
          .heroDesktop { display: block; }
        }
      `}</style>
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
