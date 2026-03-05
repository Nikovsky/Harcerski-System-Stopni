// @file: apps/web/src/app/[locale]/profile/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import {
  userDashboardResponseSchema,
  type UserDashboardResponse,
} from "@hss/schemas";
import { envServer } from "@/config/env.server";

async function fetchProfileViaBff(): Promise<
  | { ok: true; data: UserDashboardResponse }
  | { ok: false; status: number; message: string }
> {
  const webOrigin = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const requestId = requestHeaders.get("x-request-id");
  const bffHeaders: Record<string, string> = {
    accept: "application/json",
  };
  if (cookieHeader) {
    bffHeaders.cookie = cookieHeader;
  }
  if (requestId) {
    bffHeaders["x-request-id"] = requestId;
  }

  let res: Response;

  try {
    res = await fetch(`${webOrigin}/api/backend/profile`, {
      method: "GET",
      cache: "no-store",
      headers: bffHeaders,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, status: 502, message: "BFF unavailable." };
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

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // ✅ unwrap params ONCE
  const { locale } = await params;
  const t = await getTranslations("common");
  const result = await fetchProfileViaBff();

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{t("profilePage.title")}</h1>

        <div className="mt-6 rounded-lg border border-neutral-200/60 dark:border-neutral-800 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">{result.message}</p>

          <div className="mt-4 flex gap-3">
            <Link className="text-sm underline" href={`/${locale}/`}>
              {t("nav.home")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const u = result.data;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t("profilePage.title")}</h1>
      <Link className="text-sm underline" href={`/${locale}/profile/edit`}>
        {t("profilePage.edit")}
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
