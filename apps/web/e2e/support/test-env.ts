// @file: apps/web/e2e/support/test-env.ts
import { z } from "zod";

const booleanStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return true;
    }

    const normalized = value.toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  });

const e2eEnvSchema = z.object({
  HSS_E2E_BASE_URL: z.string().trim().url().default("https://hss.local"),
  HSS_E2E_LOCALE: z.string().trim().min(2).default("pl"),
  HSS_E2E_IGNORE_HTTPS_ERRORS: booleanStringSchema,
  HSS_E2E_COMMISSION_USERNAME: z.string().trim().min(1).optional(),
  HSS_E2E_COMMISSION_PASSWORD: z.string().min(1).optional(),
  HSS_E2E_MEETINGS_USERNAME: z.string().trim().min(1).optional(),
  HSS_E2E_MEETINGS_PASSWORD: z.string().min(1).optional(),
  HSS_E2E_READONLY_USERNAME: z.string().trim().min(1).optional(),
  HSS_E2E_READONLY_PASSWORD: z.string().min(1).optional(),
});

export type E2eProfile = "commission" | "meetings" | "readonly";

type E2eCredentials = {
  username: string;
  password: string;
};

type E2eEnv = {
  baseUrl: string;
  locale: string;
  ignoreHttpsErrors: boolean;
  commission: E2eCredentials | null;
  meetings: E2eCredentials | null;
  readonly: E2eCredentials | null;
};

let cachedEnv: E2eEnv | null = null;

function buildCredentials(
  username: string | undefined,
  password: string | undefined,
): E2eCredentials | null {
  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export function getE2eEnv(): E2eEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = e2eEnvSchema.parse(process.env);

  cachedEnv = {
    baseUrl: parsed.HSS_E2E_BASE_URL,
    locale: parsed.HSS_E2E_LOCALE,
    ignoreHttpsErrors: parsed.HSS_E2E_IGNORE_HTTPS_ERRORS,
    commission: buildCredentials(
      parsed.HSS_E2E_COMMISSION_USERNAME,
      parsed.HSS_E2E_COMMISSION_PASSWORD,
    ),
    meetings: buildCredentials(
      parsed.HSS_E2E_MEETINGS_USERNAME,
      parsed.HSS_E2E_MEETINGS_PASSWORD,
    ),
    readonly: buildCredentials(
      parsed.HSS_E2E_READONLY_USERNAME,
      parsed.HSS_E2E_READONLY_PASSWORD,
    ),
  };

  return cachedEnv;
}

export function hasProfileCredentials(profile: E2eProfile): boolean {
  return getProfileCredentials(profile) !== null;
}

export function getProfileCredentials(
  profile: E2eProfile,
): E2eCredentials | null {
  const env = getE2eEnv();

  switch (profile) {
    case "commission":
      return env.commission;
    case "meetings":
      return env.meetings;
    case "readonly":
      return env.readonly;
  }
}

export function requireProfileCredentials(profile: E2eProfile): E2eCredentials {
  const credentials = getProfileCredentials(profile);

  if (!credentials) {
    const variablePrefixByProfile: Record<E2eProfile, string> = {
      commission: "HSS_E2E_COMMISSION",
      meetings: "HSS_E2E_MEETINGS",
      readonly: "HSS_E2E_READONLY",
    };

    throw new Error(
      `Missing browser test credentials for profile "${profile}". Set ${variablePrefixByProfile[profile]}_USERNAME and ${variablePrefixByProfile[profile]}_PASSWORD.`,
    );
  }

  return credentials;
}
