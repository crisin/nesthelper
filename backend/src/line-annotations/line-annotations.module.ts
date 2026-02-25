import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LineAnnotationsController } from './line-annotations.controller';
import { LineAnnotationsService } from './line-annotations.service';

@Module({
  imports: [AuthModule],
  providers: [LineAnnotationsService],
  controllers: [LineAnnotationsController],
})
export class LineAnnotationsModule {}
