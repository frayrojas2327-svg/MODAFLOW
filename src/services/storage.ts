import { AppState, Product, Sale, Expense, Income } from '../types';
import { generateId } from '../lib/utils';

const STORAGE_KEY = 'modaflow_data';

const sampleProducts: Product[] = [
  {
    id: generateId(),
    name: 'Polo Oversize Essential',
    category: 'Polos',
    design: 'Colección Básicos',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200',
    price: 59.90,
    cost: 25.00,
    createdAt: new Date().toISOString(),
    ownerUid: 'sample',
    variants: [
      { id: generateId(), size: 'S', color: 'Negro', stock: 15 },
      { id: generateId(), size: 'M', color: 'Negro', stock: 20 },
      { id: generateId(), size: 'L', color: 'Negro', stock: 5 },
    ]
  },
  {
    id: generateId(),
    name: 'Polera Hoodie Streetwear',
    category: 'Poleras',
    design: 'Urban Style',
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=200',
    price: 129.90,
    cost: 55.00,
    createdAt: new Date().toISOString(),
    ownerUid: 'sample',
    variants: [
      { id: generateId(), size: 'M', color: 'Gris', stock: 12 },
      { id: generateId(), size: 'L', color: 'Gris', stock: 8 },
    ]
  }
];

const sampleExpenses: Expense[] = [
  { id: generateId(), description: 'Compra de telas', category: 'Producción', amount: 450, date: new Date().toISOString(), ownerUid: 'sample' },
  { id: generateId(), description: 'Publicidad Instagram', category: 'Publicidad', amount: 100, date: new Date().toISOString(), ownerUid: 'sample' },
];

const sampleIncomes: Income[] = [
  { id: generateId(), description: 'Venta de retazos', category: 'Venta de Material', amount: 50, date: new Date().toISOString(), ownerUid: 'sample' },
];

const initialState: AppState = {
  products: sampleProducts,
  sales: [],
  expenses: sampleExpenses,
  incomes: sampleIncomes,
  goals: [],
  settings: {
    productCategories: ['Polos', 'Poleras', 'Pantalones', 'Accesorios', 'Otros'],
    expenseCategories: ['Producción', 'Publicidad', 'Envíos', 'Materiales', 'Otros'],
    incomeCategories: ['Venta de Material', 'Servicios', 'Inversión', 'Otros']
  }
};

export const storage = {
  getData: (): AppState => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      storage.saveData(initialState);
      return initialState;
    }
    try {
      const parsed = JSON.parse(data);
      // Ensure new fields exist for backward compatibility
      if (!parsed.incomes) parsed.incomes = [];
      if (!parsed.goals) parsed.goals = [];
      if (!parsed.settings.incomeCategories) parsed.settings.incomeCategories = ['Otros'];
      return parsed;
    } catch (e) {
      console.error('Error parsing storage data', e);
      return initialState;
    }
  },

  saveData: (data: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  addProduct: (product: Product) => {
    const data = storage.getData();
    data.products.push(product);
    storage.saveData(data);
  },

  updateProduct: (updatedProduct: Product) => {
    const data = storage.getData();
    data.products = data.products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    storage.saveData(data);
  },

  deleteProduct: (id: string) => {
    const data = storage.getData();
    data.products = data.products.filter(p => p.id !== id);
    storage.saveData(data);
  },

  addSale: (sale: Sale) => {
    const data = storage.getData();
    data.sales.push(sale);
    
    // Update stock
    const product = data.products.find(p => p.id === sale.productId);
    if (product) {
      const variant = product.variants.find(v => v.id === sale.variantId);
      if (variant) {
        variant.stock -= sale.quantity;
      }
    }
    
    storage.saveData(data);
  },

  addExpense: (expense: Expense) => {
    const data = storage.getData();
    data.expenses.push(expense);
    storage.saveData(data);
  },

  deleteExpense: (id: string) => {
    const data = storage.getData();
    data.expenses = data.expenses.filter(e => e.id !== id);
    storage.saveData(data);
  },

  addIncome: (income: Income) => {
    const data = storage.getData();
    data.incomes.push(income);
    storage.saveData(data);
  },

  deleteIncome: (id: string) => {
    const data = storage.getData();
    data.incomes = data.incomes.filter(i => i.id !== id);
    storage.saveData(data);
  }
};
