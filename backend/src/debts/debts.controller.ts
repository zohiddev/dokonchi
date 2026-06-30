import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DebtsService } from './debts.service';
import { CreateDebtChargeDto } from './dto/create-debt-charge.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';

@ApiTags('debts')
@ApiBearerAuth()
@Controller('debts')
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get()
  @ApiOperation({ summary: 'Qarzdor mijozlar (balans > 0)' })
  findAll() {
    return this.debts.findAll();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Jami qarz va qarzdorlar soni' })
  summary() {
    return this.debts.summary();
  }

  @Post('payments')
  @ApiOperation({ summary: "Nasiya to'lovi qabul qilish" })
  createPayment(@Body() dto: CreateDebtPaymentDto) {
    return this.debts.createPayment(dto);
  }

  @Post('charges')
  @ApiOperation({ summary: "Qo'lda eski/oldingi qarz qo'shish" })
  createCharge(@Body() dto: CreateDebtChargeDto) {
    return this.debts.createCharge(dto);
  }

  @Get('customers/:id/history')
  @ApiOperation({ summary: "Mijoz nasiya va to'lov tarixi" })
  history(@Param('id', ParseIntPipe) id: number) {
    return this.debts.history(id);
  }
}
