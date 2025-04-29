import { PartialType } from "@nestjs/mapped-types";
import { UserProfileDto } from "./user-profile.dto";

/**
 * @file src/modules/users/dtos/update-user-account.dto.ts
 * @description DTO, using user-profile.dto.ts to update its data (first name, last name, scout rank etc.)
 */
export class UpdateUserProfileDto extends PartialType(UserProfileDto) {}