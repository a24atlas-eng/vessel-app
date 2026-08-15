export default function App({ Component, pageProps }) {
  return (
    <>
      <link rel="stylesheet" href="/globals.css" />
      <Component {...pageProps} />
    </>
  );
}
