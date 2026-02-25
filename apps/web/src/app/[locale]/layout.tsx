// @file: apps/web/src/app/[locale]/layout.tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { cookies } from "next/headers";
import "../globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { IdleTimeoutGuard } from "@/components/auth/IdleTimeoutGuard";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { auth } from "@/auth";

type AppTheme = "dark" | "light";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

function pickTheme(v: string | undefined): AppTheme {
  return v === "dark" ? "dark" : "light";
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const jar = await cookies();
  const theme = pickTheme(jar.get("ui_theme")?.value);

  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <html lang={locale} data-theme={theme}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <Navbar />
            {isAuthenticated && <IdleTimeoutGuard />}
            <main className="grow">{children}</main>
            <Footer />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}