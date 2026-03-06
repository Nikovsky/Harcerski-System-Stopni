// @file: apps/web/src/components/ui/AccessDenied.tsx
import Link from "next/link";

type AccessDeniedAction = {
  label: string;
  href: string;
};

type AccessDeniedProps = {
  code?: string;
  codeLabel?: string;
  title?: string;
  message?: string;
  actions?: AccessDeniedAction[];
};

export function AccessDenied({
  code = "403",
  codeLabel,
  title = "Access denied",
  message = "You do not have permission to access this resource.",
  actions = [],
}: AccessDeniedProps) {
  return (
    <section className="mt-6 rounded-lg border border-neutral-200/60 dark:border-neutral-800 p-5">
      <p className="text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
        {codeLabel ?? `Error ${code}`}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h2>
      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{message}</p>

      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link key={`${action.label}:${action.href}`} className="text-sm underline" href={action.href}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
