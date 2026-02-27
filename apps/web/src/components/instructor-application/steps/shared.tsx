// @file: apps/web/src/components/instructor-application/steps/shared.tsx
"use client";

import { useTranslations } from "next-intl";
import {
  IA_BUTTON_PRIMARY_MD,
  IA_BUTTON_SECONDARY_SM,
} from "@/components/instructor-application/ui/button-classnames";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  required?: boolean;
};

export function Field({ label, children, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="[&_.input]:w-full [&_.input]:rounded-md [&_.input]:border [&_.input]:border-border [&_.input]:bg-background [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm">
        {children}
      </div>
    </label>
  );
}

type StepNavProps = {
  onPrev?: () => void;
  onNext?: () => void;
  isForm?: boolean;
};

export function StepNav({ onPrev, onNext, isForm }: StepNavProps) {
  const t = useTranslations("applications");

  return (
    <div className="flex justify-between pt-4">
      {onPrev ? (
        <button
          type="button"
          onClick={onPrev}
          className={IA_BUTTON_SECONDARY_SM}
        >
          {t("actions.previous")}
        </button>
      ) : (
        <div />
      )}
      {isForm ? (
        <button
          type="submit"
          className={IA_BUTTON_PRIMARY_MD}
        >
          {t("actions.next")}
        </button>
      ) : onNext ? (
        <button
          type="button"
          onClick={onNext}
          className={IA_BUTTON_PRIMARY_MD}
        >
          {t("actions.next")}
        </button>
      ) : null}
    </div>
  );
}
