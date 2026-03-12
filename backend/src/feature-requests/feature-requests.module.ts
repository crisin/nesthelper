import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FeatureRequestsController } from './feature-requests.controller';
import { FeatureRequestsService } from './feature-requests.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FeatureRequestsController],
  providers: [FeatureRequestsService],
})
export class FeatureRequestsModule {}
