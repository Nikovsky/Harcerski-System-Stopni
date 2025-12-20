import { Controller, Get } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';
import { AppRole } from './types';

@Controller()
export class AuthzController {
  @Get('admin/ping')
  @Roles(AppRole.ADMIN)
  pingAdmin() {
    return { ok: true, scope: 'admin' };
  }

  @Get('committee/ping')
  @Roles(
    AppRole.COMMITTEE_MEMBER,
    AppRole.SECRETARY,
    AppRole.CHAIR,
    AppRole.ADMIN,
  )
  pingCommittee() {
    return { ok: true, scope: 'committee' };
  }
}
