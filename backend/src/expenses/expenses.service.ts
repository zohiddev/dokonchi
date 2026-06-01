import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: QueryExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.month) {
      const [y, m] = query.month.split('-').map(Number);
      const from = new Date(Date.UTC(y, m - 1, 1));
      const to = new Date(Date.UTC(y, m, 1));
      where.expenseDate = { gte: from, lt: to };
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });
  }

  create(dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        category: dto.category,
        amount: dto.amount,
        notes: dto.notes ?? null,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Xarajat topilmadi');
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}
