import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'Yetkazmalar (har biri ichidagi mahsulot-partiyalari bilan)' })
  findAll(@Query() query: QueryDeliveriesDto) {
    return this.deliveries.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta yetkazma (mahsulot-partiyalari va to\'lovlari bilan)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliveries.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi yetkazma — bir nechta mahsulotni bitta kirimda qo\'shish' })
  create(@Body() dto: CreateDeliveryDto) {
    return this.deliveries.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Yetkazma sarlavhasini tahrirlash (ta'minotchi/sana/izoh)" })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDeliveryDto) {
    return this.deliveries.update(id, dto);
  }
}
