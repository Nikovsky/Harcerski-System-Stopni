// @file: apps/web/src/app/[locale]/dashboard/page.tsx
import Link from "next/link";
import {
  userDashboardResponseSchema,
  type UserDashboardResponse,
} from "@hss/schemas";
import { auth } from "@/auth";
import { envServer } from "@/config/env.server";

async function fetchDashboard(): Promise<
  | { ok: true; data: UserDashboardResponse }
  | { ok: false; status: number; message: string }
> {
  const session = await auth();
  const accessToken = session?.accessToken;
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      message:
        session?.error === "RefreshTokenExpired"
          ? "Session expired. Please log in again."
          : "Authentication required.",
    };
  }

  const apiBaseUrl = envServer.HSS_API_BASE_URL.replace(/\/$/, "");
  let res: Response;

  try {
    res = await fetch(`${apiBaseUrl}/profile`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, status: 502, message: "Backend unavailable." };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, message: `Request failed (${res.status})` };
  }

  const json = await res.json();
  const parsed = userDashboardResponseSchema.safeParse(json);

  if (!parsed.success) {
    return { ok: false, status: 500, message: "Invalid response contract from API." };
  }

  return { ok: true, data: parsed.data };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[240px_1fr] sm:gap-4 border-b border-neutral-200/60 dark:border-neutral-800">
      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</div>
      <div className="text-sm text-neutral-900 dark:text-neutral-100 wrap-break-word">{value}</div>
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // ✅ unwrap params ONCE
  const { locale } = await params;

  const result = await fetchDashboard();

  if (!result.ok) {
    const isAuthError = result.status === 401 || result.status === 403;

    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <div className="mt-6 rounded-lg border border-neutral-200/60 dark:border-neutral-800 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            {isAuthError
              ? "You are not logged in or you don’t have access."
              : result.message}
          </p>

          <div className="mt-4 flex gap-3">
            <Link className="text-sm underline" href={`/${locale}/auth/login`}>
              Go to login
            </Link>
            <Link className="text-sm underline" href={`/${locale}/`}>
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const u = result.data;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Link className="text-sm underline" href={`/${locale}/dashboard/edit`}>
        Edit
      </Link>

      <section className="mt-6 rounded-lg border border-neutral-200/60 dark:border-neutral-800 p-5">
        <Row label="UUID" value={u.uuid} />
        <Row label="Keycloak UUID" value={u.keycloakUuid} />
        <Row label="Email" value={u.email ?? "—"} />
        <Row label="Imię" value={u.firstName ?? "—"} />
        <Row label="Drugie imię" value={u.secondName ?? "—"} />
        <Row label="Nazwisko" value={u.surname ?? "—"} />
        <Row label="Phone" value={u.phone ?? "—"} />
        <Row label="Birth date" value={u.birthDate ? new Date(u.birthDate).toLocaleDateString() : "—"} />
        <Row label="Role" value={u.role} />
        <Row label="Status" value={u.status} />
        <Row label="Hufiec" value={u.hufiecCode ?? "—"} />
        <Row label="Drużyna" value={u.druzynaCode ?? "—"} />
        <Row label="Scout rank" value={u.scoutRank ?? "—"} />
        <Row label="Instructor rank" value={u.instructorRank ?? "—"} />
        <Row label="Created" value={new Date(u.createdAt).toLocaleString()} />
        <Row label="Updated" value={new Date(u.updatedAt).toLocaleString()} />
      </section>
    </main>
  );
}
