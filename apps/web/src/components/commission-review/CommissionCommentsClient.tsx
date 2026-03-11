// @file: apps/web/src/components/commission-review/CommissionCommentsClient.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { CommissionInlineAnnotationTrigger } from "@/components/commission-review/CommissionInlineAnnotationTrigger";
import type { CommissionReviewInternalNote } from "@hss/schemas";

type Props = {
  notes: CommissionReviewInternalNote[];
  currentUserUuid: string;
  canCreate: boolean;
  canEdit: boolean;
  onCreateApplicationNote: () => void;
  onEditNote: (note: CommissionReviewInternalNote) => void;
  resolveAnchorLabel: (note: CommissionReviewInternalNote) => string;
};

function formatDateTime(locale: string, value: string): string {
  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "pl-PL");
}

function formatAuthor(note: CommissionReviewInternalNote): string {
  const fullName = [note.author.firstName, note.author.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || note.author.email || note.author.userUuid;
}

export function CommissionCommentsClient({
  notes,
  currentUserUuid,
  canCreate,
  canEdit,
  onCreateApplicationNote,
  onEditNote,
  resolveAnchorLabel,
}: Props) {
  const t = useTranslations("commission");
  const locale = useLocale();

  return (
    <section className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("notes.title")}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            {t("notes.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/60">
            {t("notes.count", { count: notes.length })}
          </span>
          {canCreate && (
            <CommissionInlineAnnotationTrigger
              label={t("notes.addApplicationNote")}
              tone="internal"
              onClick={onCreateApplicationNote}
            />
          )}
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/55">
          {t("notes.empty")}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {notes.map((note) => (
            <article
              key={note.uuid}
              className="rounded-2xl border border-border/70 bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t("notes.authorLabel", { author: formatAuthor(note) })}
                  </p>
                  <p className="mt-1 break-words text-xs uppercase tracking-[0.16em] text-foreground/45">
                    {resolveAnchorLabel(note)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && note.author.userUuid === currentUserUuid && (
                    <button
                      type="button"
                      onClick={() => onEditNote(note)}
                      className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70 transition hover:border-primary/40 hover:text-foreground"
                    >
                      {t("notes.edit")}
                    </button>
                  )}
                  <time className="text-xs text-foreground/50">
                    {note.updatedAt !== note.createdAt
                      ? t("notes.updatedAtLabel", {
                          date: formatDateTime(locale, note.updatedAt),
                        })
                      : t("notes.createdAtLabel", {
                          date: formatDateTime(locale, note.createdAt),
                        })}
                  </time>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                {note.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
