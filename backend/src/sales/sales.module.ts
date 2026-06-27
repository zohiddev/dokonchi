import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { FifoService } from './fifo.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TelegramModule],
  controllers: [SalesController],
  providers: [SalesService, FifoService],
  exports: [SalesService, FifoService],
})
export class SalesModule {}
