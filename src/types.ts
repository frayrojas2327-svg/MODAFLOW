export type Category = string;
export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Yape' | 'Plin';
export type ExpenseCategory = string;
export type IncomeCategory = string;

export interface UserSettings {
  productCategories: string[];
  expenseCategories: string[];
  incomeCategories: string[];
  geminiApiKey?: string;
  openaiApiKey?: string;
}

export interface Variant {
  id: string;
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  design: string;
  imageUrl?: string;
  price: number;
  cost: number;
  variants: Variant[];
  createdAt: string;
  ownerUid: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  date: string;
  ownerUid: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  ownerUid: string;
}

export interface Income {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  ownerUid: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  ownerUid: string;
}

export interface AppState {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  incomes: Income[];
  settings: UserSettings;
}
