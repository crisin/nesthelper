import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineAnnotationsService } from './line-annotations.service';

@Module({
  imports: [PrismaModule],
  providers: [LineAnnotationsService],
  exports: [LineAnnotationsService],
})
export class LineAnnotationsModule {}
