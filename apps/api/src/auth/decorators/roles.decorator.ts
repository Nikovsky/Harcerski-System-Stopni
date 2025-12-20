import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../auth.constants';
import { AppRole } from '../../auth/types';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
