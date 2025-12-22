export default async function MePage() {
  const res = await fetch("http://localhost:3000/api/hss/me", {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));

  return (
    <main style={{ padding: 24 }}>
      <h1>/me</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
