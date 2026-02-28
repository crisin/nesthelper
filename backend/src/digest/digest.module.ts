import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';

@Module({
  imports: [AuthModule],
  controllers: [DigestController],
  providers: [DigestService],
})
export class DigestModule {}
