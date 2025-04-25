/**
 * @file src/modules/auth/auth-user-role.enum.ts
 * @description Enum representing the possible user roles in the SKI/SKS system.
 */

/**
 * @description User roles used for access control and permissions management.
 */
export enum UserRole {
    ADMIN = 'Administrator',
    PRZEWODNICZACY = 'Przewodniczący',
    CZLONEK_KI = "Członek komisji",
    SEKRETARZ = "Sekretarz",
    UZYTKOWNIK = "Użytkownik",
}