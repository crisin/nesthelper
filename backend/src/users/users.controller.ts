import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserSettingsService } from './user-settings.service';
import { UsersService } from './users.service';

type AuthedRequest = { user: { id: string } };

/**
 * The non-admin view of who else is here. Analytics that compare people need
 * names to label their columns, and the admin list is behind AdminGuard.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly settings: UserSettingsService,
  ) {}

  /** Active accounts, id and display name only — never email. */
  @Get('peers')
  peers() {
    return this.users.listPeers();
  }

  /** The caller's UI settings (sections keyed by name). */
  @Get('me/settings')
  getSettings(@Req() req: AuthedRequest) {
    return this.settings.get(req.user.id);
  }

  /** Replaces the sent sections, keeps the others; `null` drops a section. */
  @Patch('me/settings')
  patchSettings(@Req() req: AuthedRequest, @Body() body: unknown) {
    return this.settings.patch(req.user.id, body);
  }
}
