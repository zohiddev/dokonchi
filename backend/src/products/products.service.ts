import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.categoryId !== undefined) where.categoryId = query.categoryId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { barcode: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return product;
  }

  async create(dto: CreateProductDto) {
    await this.ensureCategoryExists(dto.categoryId);
    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
          baseUnit: dto.baseUnit,
          packSize: dto.packSize ?? null,
          barcode: dto.barcode ?? null,
          defaultSalePrice: dto.defaultSalePrice ?? null,
          isActive: dto.isActive ?? true,
        },
        include: { category: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Bu shtrix-kod allaqachon ishlatilgan');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    if (dto.categoryId !== undefined) await this.ensureCategoryExists(dto.categoryId);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.baseUnit !== undefined) data.baseUnit = dto.baseUnit;
    if (dto.packSize !== undefined) data.packSize = dto.packSize;
    if (dto.barcode !== undefined) data.barcode = dto.barcode || null;
    if (dto.defaultSalePrice !== undefined) data.defaultSalePrice = dto.defaultSalePrice;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.product.update({
        where: { id },
        data,
        include: { category: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Bu shtrix-kod allaqachon ishlatilgan');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: { category: true },
    });
  }

  private async ensureCategoryExists(categoryId: number): Promise<void> {
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('Toifa topilmadi');
  }
}
