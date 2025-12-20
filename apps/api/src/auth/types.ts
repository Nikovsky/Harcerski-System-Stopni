import { AppRole } from '@prisma/client';

export type AuthPrincipal = {
  sub: string; // Keycloak user id
  email?: string;
  displayName?: string;
  azp?: string;
  roles: AppRole[];
  rawRoles: string[];
};

export { AppRole };
