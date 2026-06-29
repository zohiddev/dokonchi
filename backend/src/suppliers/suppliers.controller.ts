import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  findAll() {
    return this.suppliers.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliers.findOne(id);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: "Ta'minotchi qarzi va oldi-berdi ko'rsatkichlari" })
  balance(@Param('id', ParseIntPipe) id: number) {
    return this.suppliers.balance(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: "Ta'minotchi oldi-berdi tarixi (partiya + to'lov)" })
  history(@Param('id', ParseIntPipe) id: number) {
    return this.suppliers.history(id);
  }

  @Get(':id/products')
  @ApiOperation({ summary: "Ta'minotchi avval yetkazgan mahsulotlar (yetkazma modalida filtr uchun)" })
  products(@Param('id', ParseIntPipe) id: number) {
    return this.suppliers.products(id);
  }

  @Post('payments')
  @ApiOperation({ summary: "Ta'minotchiga to'lov qabul qilish" })
  createPayment(@Body() dto: CreateSupplierPaymentDto) {
    return this.suppliers.createPayment(dto);
  }

  @Post()
  @ApiOperation({ summary: "Yangi ta'minotchi" })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suppliers.remove(id);
  }
}
