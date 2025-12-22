"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/me";

  return (
    <main style={{ padding: 24 }}>
      <h1>Logowanie</h1>
      <p>Zaloguj się przez Keycloak.</p>

      <button
        onClick={() => signIn("keycloak", { callbackUrl })}
        style={{ marginTop: 12, padding: "8px 12px" }}
      >
        Zaloguj przez Keycloak
      </button>
    </main>
  );
}
