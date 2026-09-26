import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUsersController } from './admin-users.controller';
import { UsersController } from './users.controller';
import { UsersBootstrapService } from './users-bootstrap.service';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminUsersController, UsersController],
  providers: [UsersService, UsersBootstrapService],
  exports: [UsersService],
})
export class UsersModule {}
