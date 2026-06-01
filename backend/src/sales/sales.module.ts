import { Module } from '@nestjs/common';
import { FifoService } from './fifo.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, FifoService],
  exports: [SalesService, FifoService],
})
export class SalesModule {}
