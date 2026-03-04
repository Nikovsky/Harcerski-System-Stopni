// @file: apps/web/src/app/[locale]/page.tsx
import { notFound } from "next/navigation";
import { HomePageClient } from "@/components/home/HomePageClient";
import type { HomeMessages } from "@/components/props/pages";

const SUPPORTED = ["pl", "en"] as const;
type Locale = (typeof SUPPORTED)[number];

type Props = {
  params: Promise<{ locale: string }>;
};

function isLocale(value: string): value is Locale {
  return (SUPPORTED as readonly string[]).includes(value);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const messages = (await import(`../../../messages/${locale}/home.json`).then(
    (m) => m.default,
  )) as HomeMessages;

  return <HomePageClient messages={messages} />;
}
