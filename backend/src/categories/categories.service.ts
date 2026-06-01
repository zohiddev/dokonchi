import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Toifa topilmadi');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: { name: dto.name } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Bu nom bilan toifa mavjud');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: dto.name },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Bu nom bilan toifa mavjud');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    const inUse = await this.prisma.product.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Bu toifa ${inUse} ta mahsulot bilan bog'langan — avval mahsulotlarni boshqasiga ko'chiring`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
