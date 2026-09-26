import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

/**
 * The non-admin view of who else is here. Analytics that compare people need
 * names to label their columns, and the admin list is behind AdminGuard.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Active accounts, id and display name only — never email. */
  @Get('peers')
  peers() {
    return this.users.listPeers();
  }
}
