import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QueryBatchesDto } from './dto/query-batches.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@ApiTags('batches')
@ApiBearerAuth()
@Controller('batches')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get('attention')
  @ApiOperation({ summary: "Diqqat talab: 14+ kun eski va kam qolgan (<15%) partiyalar" })
  attention() {
    return this.batches.attention();
  }

  @Get()
  @ApiOperation({ summary: 'Partiyalar (filter: productId, weekLabel, status)' })
  findAll(@Query() query: QueryBatchesDto) {
    return this.batches.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta partiya (FIFO allocations bilan)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.batches.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi partiya' })
  create(@Body() dto: CreateBatchDto) {
    return this.batches.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Tahrirlash (faqat narx/izoh; sotilgan miqdorga tegmaydi)" })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBatchDto) {
    return this.batches.update(id, dto);
  }
}
