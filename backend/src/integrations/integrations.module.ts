import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiTokenGuard } from './api-token.guard';
import { ApiTokensService } from './api-tokens.service';
import {
  ApiTokensController,
  VizzyController,
} from './integrations.controller';
import { VizzyService } from './vizzy.service';

/**
 * Personal API tokens and the endpoints local tools use with them
 * (currently vizzy: tags / mood / lyric sections of the song it plays).
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ApiTokensController, VizzyController],
  providers: [ApiTokensService, ApiTokenGuard, VizzyService],
})
export class IntegrationsModule {}
