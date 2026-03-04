// @file: apps/web/src/components/ui/LocaleSwitcher.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { ChevronDown, Translate } from "react-bootstrap-icons";

type LocaleCode = "pl" | "en";
type LocaleSwitcherVariant = "full" | "icon";

type LocaleDefinition = {
  code: LocaleCode;
  labelKey: LocaleCode;
  flag: string;
};

const LOCALES: readonly LocaleDefinition[] = [
  { code: "pl", labelKey: "pl", flag: "🇵🇱" },
  { code: "en", labelKey: "en", flag: "🇬🇧" },
  // { code: "de", labelKey: "de", flag: "🇩🇪" },
];

const LOCALE_SET = new Set<string>(LOCALES.map((locale) => locale.code));
const MENU_ITEM_ESTIMATED_HEIGHT_PX = 38;
const MENU_VERTICAL_PADDING_PX = 10;

function normalizePath(pathname: string): string {
  const value = pathname.trim() || "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

function replaceLocaleInPath(pathname: string, nextLocale: LocaleCode): string {
  const normalizedPath = normalizePath(pathname);
  const pathWithoutQuery = normalizedPath.split(/[?#]/, 1)[0] ?? "/";
  const segments = pathWithoutQuery.split("/").filter(Boolean);

  let localePrefixLength = 0;
  while (
    localePrefixLength < segments.length &&
    LOCALE_SET.has(segments[localePrefixLength] ?? "")
  ) {
    localePrefixLength += 1;
  }

  const restSegments = segments.slice(localePrefixLength);
  return `/${[nextLocale, ...restSegments].join("/")}`;
}

function setNextLocaleCookie(nextLocale: LocaleCode): void {
  const secure = window.location.protocol === "https:";
  document.cookie =
    `NEXT_LOCALE=${encodeURIComponent(nextLocale)}; ` +
    `Max-Age=31536000; Path=/; SameSite=Lax` +
    (secure ? "; Secure" : "");
}

export function LocaleSwitcher({ variant = "full" }: { variant?: LocaleSwitcherVariant }) {
  const t = useTranslations("common.localeSwitcher");
  const menuId = useId();
  const rawLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);

  const locale = useMemo<LocaleCode>(
    () => (LOCALE_SET.has(rawLocale) ? (rawLocale as LocaleCode) : "pl"),
    [rawLocale],
  );

  const currentLocale = useMemo<LocaleDefinition>(
    () => LOCALES.find((item) => item.code === locale) ?? LOCALES[0],
    [locale],
  );

  const availableLocales = useMemo(
    () => LOCALES.filter((item) => item.code !== locale),
    [locale],
  );

  const updateMenuDirection = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedMenuHeight =
      menuRef.current?.offsetHeight ??
      availableLocales.length * MENU_ITEM_ESTIMATED_HEIGHT_PX + MENU_VERTICAL_PADDING_PX;

    setDropUp(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow);
  }, [availableLocales.length]);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isPending) return;
    setOpen((previous) => {
      const next = !previous;
      if (next) window.requestAnimationFrame(updateMenuDirection);
      return next;
    });
  }, [isPending, updateMenuDirection]);

  const switchLocale = useCallback(
    (nextLocale: LocaleCode) => {
      if (nextLocale === locale || isPending) {
        closeMenu();
        return;
      }

      const nextPath = replaceLocaleInPath(pathname ?? "/", nextLocale);
      const search = window.location.search ?? "";
      const hash = window.location.hash ?? "";
      const nextHref = `${nextPath}${search}${hash}`;

      setNextLocaleCookie(nextLocale);
      closeMenu();

      startTransition(() => {
        router.replace(nextHref);
      });
    },
    [closeMenu, isPending, locale, pathname, router],
  );

  useEffect(() => {
    if (!open) return;

    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      closeMenu();
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function onViewportChange() {
      updateMenuDirection();
    }

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onDocumentKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [closeMenu, open, updateMenuDirection]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(updateMenuDirection);
  }, [open, updateMenuDirection]);

  return (
    <div ref={containerRef} className="relative inline-block text-left text-sm">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("label")}
        className={
          variant === "icon"
            ? "flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            : "flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2 text-foreground shadow-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        }
      >
        <Translate size={16} aria-hidden="true" className="text-foreground/80" />
        {variant === "full" ? (
          <>
            <span aria-hidden="true" className="text-base leading-none">
              {currentLocale.flag}
            </span>
            <span className="text-xs font-semibold">{t(currentLocale.labelKey)}</span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        ) : null}
      </button>

      {open && (
        <ul
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={t("label")}
          className={[
            "absolute z-30 overflow-hidden rounded-md border border-border bg-background p-1 shadow-lg",
            variant === "icon" ? "right-0 min-w-44" : "left-0 right-0",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
          ].join(" ")}
        >
          {availableLocales.map((item) => (
            <li key={item.code} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                onClick={() => switchLocale(item.code)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted disabled:opacity-60"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {item.flag}
                </span>
                <span className="flex-1">{t(item.labelKey)}</span>
                <span className="text-xs uppercase opacity-70">{item.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
