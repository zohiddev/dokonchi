import { Module } from '@nestjs/common';
import { DebtsModule } from '../debts/debts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [InventoryModule, DebtsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
