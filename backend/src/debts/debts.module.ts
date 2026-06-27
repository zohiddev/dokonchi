import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { TelegramModule } from '../telegram/telegram.module';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';

@Module({
  imports: [CustomersModule, TelegramModule],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}
