// @file: apps/web/src/app/[locale]/layout.tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import type { Session } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { cookies } from "next/headers";
import "../globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { IdleTimeoutGuard } from "@/components/auth/IdleTimeoutGuard";
import { auth, authSessionCookieName } from "@/auth";

type AppTheme = "dark" | "light";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

function pickTheme(v: string | undefined): AppTheme {
  return v === "dark" ? "dark" : "light";
}

function isInvalidJwtSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeTyped = error as Error & { type?: unknown };
  const type =
    typeof maybeTyped.type === "string" ? maybeTyped.type.toLowerCase() : "";
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    type === "jwtsessionerror" ||
    name.includes("jwtsessionerror") ||
    message.includes("invalid jwt")
  );
}

function clearInvalidSessionHref(locale: string): string {
  const returnTo = `/${locale}`;
  return `/api/auth/clear-invalid-session?returnTo=${encodeURIComponent(returnTo)}`;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const jar = await cookies();
  const theme = pickTheme(jar.get("ui_theme")?.value);
  const hasSessionCookie = Boolean(jar.get(authSessionCookieName)?.value);

  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  let session: Session | null = null;
  try {
    session = (await auth()) as Session | null;
  } catch (error) {
    if (hasSessionCookie && isInvalidJwtSessionError(error)) {
      redirect(clearInvalidSessionHref(locale));
    }
    throw error;
  }

  if (hasSessionCookie && !session?.user) {
    redirect(clearInvalidSessionHref(locale));
  }

  const isAuthenticated = !!session?.user;

  return (
    <html lang={locale} data-theme={theme}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} session={session} />
          {isAuthenticated && <IdleTimeoutGuard />}
          <main className="grow">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
