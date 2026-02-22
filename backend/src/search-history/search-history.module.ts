import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SearchHistoryController } from './search-history.controller';
import { SearchHistoryService } from './search-history.service';

@Module({
  imports: [AuthModule],
  providers: [SearchHistoryService],
  controllers: [SearchHistoryController],
})
export class SearchHistoryModule {}
