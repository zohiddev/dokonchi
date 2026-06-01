import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Sotuvlar (filter: paymentType, from, to, limit)' })
  findAll(@Query() query: QuerySalesDto) {
    return this.sales.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta sotuv (FIFO taqsimoti bilan)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sales.findOne(id);
  }

  @Post('preview')
  @ApiOperation({ summary: 'FIFO oldindan ko\'rsatuv (saqlamasdan)' })
  preview(@Body() dto: CreateSaleDto) {
    return this.sales.preview(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi sotuv (FIFO bilan, $transaction)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser) {
    return this.sales.create(dto, user.id);
  }
}
