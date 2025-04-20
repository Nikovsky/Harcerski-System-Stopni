import { PartialType } from "@nestjs/mapped-types";
import { AuthUserAccountDto } from "./auth-user-account.dto";

/**
 * @file src/modules/auth/dtos/update-user-account.dto.ts
 * @description DTO, using auth-user-account.dto.ts to update its data (email, password)
 */
export class UpdateUserAccountDto extends PartialType(AuthUserAccountDto) {}