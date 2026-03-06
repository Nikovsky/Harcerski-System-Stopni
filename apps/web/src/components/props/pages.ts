// @file: apps/web/src/components/props/pages.ts
export type HomeMessages = {
  buttons: {
    clickMe: string;
    deploy: string;
    refresh: string;
    refreshing: string;
  };
  status: {
    backendHealthStatus: string;
    ok: string;
    error: string;
    authRequired: string;
    requestFailed: string;
    invalidSchema: string;
    unknownError: string;
    backendHealth: string;
    checking: string;
    authRequiredShort: string;
    healthy: string;
    unhealthy: string;
    message: string;
  };
};

export type HomePageClientProps = {
  messages: HomeMessages;
};

export type AboutMessages = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  panel: {
    first: string;
    second: string;
    third: string;
  };
  project: {
    title: string;
    body: string;
  };
  architecture: {
    title: string;
    body: string;
  };
  team: {
    title: string;
    role: string;
    imageAltKacper: string;
    imageAltNikolas: string;
  };
};
