// @file: apps/web/src/app/[locale]/layout.tsx
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from '@/i18n/routing';
import { cookies } from "next/headers";
import "../globals.css";
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

type AppTheme = "dark" | "light";
type Contrast = "normal" | "high";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

function pickTheme(v: string | undefined): AppTheme {
  return v === "light" ? "light" : "dark";
}

function pickContrast(v: string | undefined): Contrast {
  return v === "high" ? "high" : "normal";
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const jar = await cookies();
  const theme = pickTheme(jar.get("ui_theme")?.value);
  const contrast = pickContrast(jar.get("ui_contrast")?.value);

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} data-theme={theme} data-contrast={contrast}>
      <body className='flex min-h-screen flex-col'>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main className="grow">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}