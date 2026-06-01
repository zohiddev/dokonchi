import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Ombor: mahsulot bo\'yicha qoldiq, o\'rtacha tannarx, sotuv narxi' })
  findAll() {
    return this.inventory.findAll();
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Ombor qiymati: Σ(qoldiq × tannarx)' })
  valuation() {
    return this.inventory.valuation();
  }
}
