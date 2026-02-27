// @file: apps/web/src/components/instructor-application/detail-tabs/shared.tsx
"use client";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <div className="rounded-lg border border-border p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground/70">{title}</h2>
      {children}
    </div>
  );
}

type FieldGridProps = {
  rows: { label: string; value: string | null | undefined }[];
};

export function FieldGrid({ rows }: FieldGridProps) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs text-foreground/50">{label}</dt>
          <dd className="mt-0.5 text-sm text-foreground">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("pl-PL");
  } catch {
    return value;
  }
}
