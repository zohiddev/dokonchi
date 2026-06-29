// Backend bilan mos turlar
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type Role = 'ADMIN' | 'SOTUVCHI';
export type Unit = 'KG' | 'DONA' | 'LITR' | 'QOP' | 'QUTI';
export type PaymentType = 'NAQD' | 'KARTA' | 'NASIYA';
export type SaleMode = 'PIECE' | 'PACK';

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: Role;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  role: Role;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Category {
  id: number;
  name: string;
  _count?: { products: number };
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  barcode: string | null;
  baseUnit: Unit;
  packSize: string | null;
  packUnit: string | null;
  defaultSalePrice: string | null;
  packSalePrice: string | null;
  isActive: boolean;
  createdAt: string;
  category?: Category;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  telegramChatId?: string | null;
  _count?: { batches: number };
  // /suppliers ro'yxatida boyitilgan oldi-berdi ko'rsatkichlari (ixtiyoriy)
  batchCount?: number;
  totalPurchased?: string;
  totalPaid?: string;
  balance?: string;
  soldCostValue?: string;
  remainingCostValue?: string;
}

export interface Batch {
  id: number;
  productId: number;
  supplierId: number | null;
  deliveryId: number | null;
  receivedDate: string;
  weekLabel: string;
  quantityReceived: string;
  quantityRemaining: string;
  costPricePerUnit: string;
  salePricePerUnit: string | null;
  costPerPack: string | null;
  packSalePrice: string | null;
  notes: string | null;
  createdAt: string;
  product?: Product;
  supplier?: Supplier;
  ageDays?: number;
  remainingRatio?: number;
}

// Bitta yetkazma (kirim) — bir nechta mahsulot-partiyasini guruhlaydi
export interface Delivery {
  id: number;
  supplierId: number | null;
  receivedDate: string;
  weekLabel: string;
  notes: string | null;
  createdAt: string;
  supplier?: Supplier | null;
  batches?: Batch[];
}

export interface SaleItemBatch {
  id: number;
  batchId: number;
  quantity: string;
  costPrice: string;
  batch?: Batch;
}

export interface SaleItem {
  id: number;
  productId: number;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  saleMode: SaleMode;
  packCount: string | null;
  product?: Product;
  batches?: SaleItemBatch[];
}

export interface Sale {
  id: number;
  saleDate: string;
  userId: number;
  customerId: number | null;
  paymentType: PaymentType;
  totalAmount: string;
  totalCost: string;
  notes: string | null;
  user?: { id: number; name: string };
  customer?: Customer | null;
  items?: SaleItem[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  openingDebt: string;
  telegramChatId?: string | null;
}

export interface CustomerBalance {
  customerId: number;
  totalCredit: string;
  totalPaid: string;
  balance: string;
  lastCreditDate: string | null;
  lastPaymentDate: string | null;
}

export interface DebtCustomer extends Customer, CustomerBalance {}

export interface InventoryRow {
  productId: number;
  name: string;
  category: Category;
  baseUnit: Unit;
  packSize: string | null;
  packUnit: string | null;
  activeBatchCount: number;
  totalRemaining: string;
  avgCost: string | null;
  currentSalePrice: string | null;
  currentPackSalePrice: string | null;
}

export interface DashboardData {
  today: { revenue: string; profit: string; salesCount: number; newCredit: string; expenses: string };
  thisWeek: { revenue: string; profit: string };
  debts: { totalDebt: string; debtorCount: number };
  inventory: { totalValue: string; batchCount: number };
  productCount: number;
}

export interface TimeseriesPoint {
  label: string;
  date?: string;
  month?: string;
  total: string;
}

export interface ProfitByCategoryRow {
  categoryId: number;
  name: string;
  revenue: string;
  cost: string;
  profit: string;
}

export interface MonthlySummaryData {
  month: string;
  revenue: string;
  cost: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
  salesCount: number;
  newCreditTotal: string;
}

export interface Expense {
  id: number;
  expenseDate: string;
  category: string;
  amount: string;
  notes: string | null;
}

export interface SalePreviewItem {
  productId: number;
  productName: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  lineCost: string;
  lineProfit: string;
  saleMode: SaleMode;
  packCount: string | null;
  allocations: { batchId: number; quantity: string; costPrice: string }[];
}

export interface SalePreviewResult {
  items: SalePreviewItem[];
  totalAmount: string;
  totalCost: string;
  totalProfit: string;
}
