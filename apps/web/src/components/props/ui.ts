// @file: apps/web/src/components/props/ui.ts
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ButtonTone = "main" | "accent";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  tone?: ButtonTone;
  colorClass?: string;
};

export type PopupProps = {
  children?: ReactNode;
  onClose: () => void;
  ariaLabel?: string;
  closeButtonAriaLabel?: string;
  title?: ReactNode;
  content?: ReactNode;
  actions?: ReactNode;
  disableClose?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
};

export type SignInButtonProps = {
  locale: string;
  label?: string;
};

export type SignOutButtonProps = {
  label?: string;
  className?: string;
};

export type ThemeControlsVariant = "default" | "icon";

export type ThemeControlsProps = {
  variant?: ThemeControlsVariant;
};

export type LocaleSwitcherVariant = "full" | "icon";

export type LocaleSwitcherProps = {
  variant?: LocaleSwitcherVariant;
};

export type AuthUserMenuProps = {
  displayName: string;
  email: string;
  triggerLabel: string;
};

export type TooltipProps = {
  text: string;
};
