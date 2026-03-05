// @file: apps/web/src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED = ['pl', 'en'] as const;
type Locale = (typeof SUPPORTED)[number];

function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (SUPPORTED as readonly string[]).includes(v);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolvedLocale = await requestLocale;
  const locale: Locale = isLocale(resolvedLocale) ? resolvedLocale : 'pl';

  const [common, applications] = await Promise.all([
    import(`../../messages/${locale}/common.json`).then((m) => m.default),
    import(`../../messages/${locale}/applications.json`).then((m) => m.default),
  ]);

  return {
    locale,
    messages: { common, applications },
  };
});
