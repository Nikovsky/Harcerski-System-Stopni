"use client";

// @file: apps/web/src/app/[locale]/dashboard/edit/page.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userDashboardResponseSchema,
  userDashboardUpdatePrivilegedBodySchema,
  type UserDashboardResponse,
  type UserDashboardUpdatePrivilegedBody,
} from "@hss/schemas";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string; status?: number }
  | { kind: "ready"; data: UserDashboardResponse };

function toDateOnly(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function DashboardEditPage() {
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale ?? "en");

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const form = useForm<UserDashboardUpdatePrivilegedBody>({
    resolver: zodResolver(userDashboardUpdatePrivilegedBodySchema),
    defaultValues: {
      firstName: null,
      secondName: null,
      surname: null,
      phone: null,
      birthDate: null,

      // privileged fields (optional)
      hufiecCode: null,
      druzynaCode: null,
      scoutRank: null,
      scoutRankAwardedAt: null,
      instructorRank: null,
      instructorRankAwardedAt: null,
      inScoutingSince: null,
      inZhrSince: null,
      oathDate: null,
    },
    mode: "onBlur",
  });

  const { register, handleSubmit, reset, formState } = form;

  const isPrivilegedUI = useMemo(() => {
    if (state.kind !== "ready") return false;
    // Simple UI rule: show extra fields when role is not USER.
    // Backend is the source of truth anyway.
    return state.data.role !== "USER";
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ kind: "loading" });
      setSaveMsg(null);

      try {
        const res = await fetch("/api/backend/dashboard", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: { accept: "application/json" },
        });

        if (!res.ok) {
          if (cancelled) return;
          setState({
            kind: "error",
            status: res.status,
            message: `Request failed (${res.status})`,
          });
          return;
        }

        const json = await res.json();
        const parsed = userDashboardResponseSchema.safeParse(json);
        if (!parsed.success) {
          if (cancelled) return;
          setState({
            kind: "error",
            message: "Invalid response contract from API.",
          });
          return;
        }

        const data = parsed.data;

        // reset form values from API response (PATCH-friendly: nulls allowed)
        reset({
          firstName: data.firstName,
          secondName: data.secondName,
          surname: data.surname,
          phone: data.phone,
          birthDate: toDateOnly(data.birthDate),

          hufiecCode: data.hufiecCode,
          druzynaCode: data.druzynaCode,
          scoutRank: data.scoutRank,
          scoutRankAwardedAt: toDateOnly(data.scoutRankAwardedAt),
          instructorRank: data.instructorRank,
          instructorRankAwardedAt: toDateOnly(data.instructorRankAwardedAt),
          inScoutingSince: toDateOnly(data.inScoutingSince),
          inZhrSince: toDateOnly(data.inZhrSince),
          oathDate: toDateOnly(data.oathDate),
        });

        if (cancelled) return;
        setState({ kind: "ready", data });
      } catch (e: any) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e?.message ?? "Unknown error",
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaveMsg(null);

    // Send ONLY changed fields (dirtyFields) -> prevents wiping.
    const dirty = formState.dirtyFields as Partial<
      Record<keyof UserDashboardUpdatePrivilegedBody, boolean>
    >;

    const payload: Partial<UserDashboardUpdatePrivilegedBody> = {};

    (Object.keys(dirty) as (keyof UserDashboardUpdatePrivilegedBody)[]).forEach(
      (k) => {
        if (dirty[k]) {
          (payload as Record<string, any>)[k] = values[k];
        }
      },
    );

    if (Object.keys(payload).length === 0) {
      setSaveMsg("No changes to save.");
      return;
    }

    try {
      const res = await fetch("/api/backend/dashboard", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Save failed (${res.status})`;
        try {
          const err = await res.json();
          if (err?.message) msg = String(err.message);
        } catch {
          // ignore
        }
        setSaveMsg(msg);
        return;
      }

      const json = await res.json();
      const parsed = userDashboardResponseSchema.safeParse(json);
      if (!parsed.success) {
        setSaveMsg("Saved, but API returned invalid contract.");
        return;
      }

      // Refresh state + reset dirtiness
      setState({ kind: "ready", data: parsed.data });
      reset({
        firstName: parsed.data.firstName,
        secondName: parsed.data.secondName,
        surname: parsed.data.surname,
        phone: parsed.data.phone,
        birthDate: toDateOnly(parsed.data.birthDate),

        hufiecCode: parsed.data.hufiecCode,
        druzynaCode: parsed.data.druzynaCode,
        scoutRank: parsed.data.scoutRank,
        scoutRankAwardedAt: toDateOnly(parsed.data.scoutRankAwardedAt),
        instructorRank: parsed.data.instructorRank,
        instructorRankAwardedAt: toDateOnly(parsed.data.instructorRankAwardedAt),
        inScoutingSince: toDateOnly(parsed.data.inScoutingSince),
        inZhrSince: toDateOnly(parsed.data.inZhrSince),
        oathDate: toDateOnly(parsed.data.oathDate),
      });

      setSaveMsg("Saved.");
      // optional: go back
      // router.push(`/${locale}/dashboard`);
    } catch (e: any) {
      setSaveMsg(e?.message ?? "Unknown error");
    }
  });

  if (state.kind === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Edit dashboard</h1>
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
          Loading…
        </p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Edit dashboard</h1>
        <div className="mt-6 rounded-lg border border-neutral-200/60 dark:border-neutral-800 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            {state.message}
          </p>
          <div className="mt-4 flex gap-3">
            <Link className="text-sm underline" href={`/${locale}/dashboard`}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Update your profile fields.
          </p>
        </div>

        <Link className="text-sm underline" href={`/${locale}/dashboard`}>
          Back
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-6 rounded-lg border border-neutral-200/60 dark:border-neutral-800 p-5 space-y-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name">
            <input
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
              {...register("firstName", { setValueAs: (v) => (v === "" ? null : v) })}
              placeholder="e.g. Jan"
            />
          </Field>

          <Field label="Second name">
            <input
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
              {...register("secondName", { setValueAs: (v) => (v === "" ? null : v) })}
              placeholder="optional"
            />
          </Field>

          <Field label="Surname">
            <input
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
              {...register("surname", { setValueAs: (v) => (v === "" ? null : v) })}
              placeholder="e.g. Kowalski"
            />
          </Field>

          <Field label="Phone">
            <input
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
              {...register("phone", { setValueAs: (v) => (v === "" ? null : v) })}
              placeholder="+48…"
            />
          </Field>

          <Field label="Birth date">
            <input
              type="date"
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
              {...register("birthDate", { setValueAs: (v) => (v === "" ? null : v) })}
            />
          </Field>
        </div>

        {isPrivilegedUI && (
          <div className="border-t border-neutral-200/60 dark:border-neutral-800 pt-6">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Privileged fields
            </h2>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              Visible for roles above USER. API still enforces permissions.
            </p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Hufiec code">
                <input
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
                  {...register("hufiecCode", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </Field>

              <Field label="Drużyna code">
                <input
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
                  {...register("druzynaCode", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </Field>

              <Field label="In scouting since">
                <input
                  type="date"
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
                  {...register("inScoutingSince", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </Field>

              <Field label="In ZHR since">
                <input
                  type="date"
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
                  {...register("inZhrSince", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </Field>

              <Field label="Oath date">
                <input
                  type="date"
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm"
                  {...register("oathDate", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </Field>
            </div>
          </div>
        )}

        {saveMsg && (
          <div className="text-sm text-neutral-700 dark:text-neutral-200">
            {saveMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm font-semibold active:translate-y-px"
          >
            Save
          </button>

          <button
            type="button"
            className="rounded-md border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm"
            onClick={() => router.push(`/${locale}/dashboard`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}