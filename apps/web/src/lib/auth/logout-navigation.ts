// @file: apps/web/src/lib/auth/logout-navigation.ts
type LogoutNavigationOptions = {
  returnTo: string;
  reason?: "timeout";
};

function normalizeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * Submits logout as a top-level POST navigation so the browser can follow the
 * OIDC end-session redirect without treating the Keycloak request as CORS.
 */
export function navigateToLogout(options: LogoutNavigationOptions): void {
  const params = new URLSearchParams({
    returnTo: normalizeReturnTo(options.returnTo),
  });
  if (options.reason) params.set("reason", options.reason);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/auth/logout?${params.toString()}`;
  form.hidden = true;
  document.body.appendChild(form);
  form.submit();
}
