// @file: apps/web/src/components/layout/Footer.tsx
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-foreground/70">&copy; {year} HSS. All rights reserved.</p>

        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="text-sm text-foreground/70 hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-foreground/70 hover:text-foreground">
            Terms
          </Link>
          <Link href="/contact" className="text-sm text-foreground/70 hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
