// @file: apps/web/src/components/layout/Footer.tsx
import { ThemeControls } from "@/components/ui/ThemeControls";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1">
        <p className="text-sm text-foreground/70">&copy; {year} HSS &bull; AGPL-3.0 License</p>
        <div className="flex items-center gap-2">
          <ThemeControls />
          <LocaleSwitcher variant="full" />
        </div>
      </div>
    </footer>
  );
}
