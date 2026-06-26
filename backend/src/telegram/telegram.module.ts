import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [CustomersModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
