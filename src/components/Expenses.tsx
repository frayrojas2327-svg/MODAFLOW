import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  TrendingDown, 
  Trash2, 
  Calendar,
  X,
  Save,
  Tag,
  Filter,
  ChevronDown
} from 'lucide-react';
import { AppState, Expense, ExpenseCategory } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpensesProps {
  data: AppState;
  onUpdate: () => void;
}

export default function Expenses({ data, onUpdate }: ExpensesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '12m' | 'custom'>('30d');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());

  const handleRangeChange = (range: '7d' | '30d' | '6m' | '12m') => {
    setTimeRange(range);
    const end = new Date();
    let start = new Date();
    if (range === '7d') start = subDays(end, 7);
    else if (range === '30d') start = subDays(end, 30);
    else if (range === '6m') start = subMonths(end, 6);
    else if (range === '12m') start = subMonths(end, 12);
    setStartDate(start);
    setEndDate(end);
  };

  const expenseCategories = data.settings.expenseCategories;

  const filteredExpenses = data.expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || e.category === selectedCategory;
    const matchesDate = isWithinInterval(new Date(e.date), { 
      start: startOfDay(startDate), 
      end: endOfDay(endDate) 
    });
    return matchesSearch && matchesCategory && matchesDate;
  });

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      await firebaseService.deleteExpense(id);
      onUpdate();
    }
  };

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-white/50 mt-0.5 text-xs md:text-sm">Controla los egresos de tu negocio.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-xs md:text-sm font-medium"
          >
            <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden xs:inline">Categorías</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg md:rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(239,68,68,0.3)] text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Registrar Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-black p-4 md:p-6 rounded-xl md:rounded-2xl border border-white/5 shadow-xl">
          <p className="text-white/40 text-[10px] md:text-sm font-medium uppercase tracking-wider">Total Gastos</p>
          <h4 className="text-xl md:text-2xl font-bold mt-0.5 md:text-red-500">{formatCurrency(totalExpenses)}</h4>
        </div>
        <div className="bg-black p-4 md:p-6 rounded-xl md:rounded-2xl border border-white/5 shadow-xl">
          <p className="text-white/40 text-[10px] md:text-sm font-medium uppercase tracking-wider">Gastos este mes</p>
          <h4 className="text-xl md:text-2xl font-bold mt-0.5">{formatCurrency(totalExpenses)}</h4>
        </div>
        <div className="bg-black p-4 md:p-6 rounded-xl md:rounded-2xl border border-white/5 shadow-xl">
          <p className="text-white/40 text-[10px] md:text-sm font-medium uppercase tracking-wider">Nro. de Egresos</p>
          <h4 className="text-xl md:text-2xl font-bold mt-0.5">{filteredExpenses.length}</h4>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {(['7d', '30d', '6m', '12m'] as const).map((range) => (
            <button 
              key={range}
              onClick={() => handleRangeChange(range)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all uppercase whitespace-nowrap",
                timeRange === range ? "bg-red-500 text-white" : "text-white/40 hover:text-white"
              )}
            >
              {range}
            </button>
          ))}
          <button 
            onClick={() => setTimeRange('custom')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all uppercase whitespace-nowrap",
              timeRange === 'custom' ? "bg-red-500 text-white" : "text-white/40 hover:text-white"
            )}
          >
            Personalizado
          </button>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
          <Calendar className="w-5 h-5 text-orange-500" />
          <div className="flex items-center gap-1">
            <input 
              type="date" 
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) {
                  setStartDate(newDate);
                  setTimeRange('custom');
                }
              }}
              className="bg-transparent text-[10px] md:text-xs font-medium focus:outline-none text-white/60 hover:text-white transition-colors"
            />
            <span className="text-white/20">-</span>
            <input 
              type="date" 
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) {
                  setEndDate(newDate);
                  setTimeRange('custom');
                }
              }}
              className="bg-transparent text-[10px] md:text-xs font-medium focus:outline-none text-white/60 hover:text-white transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/20" />
          <input 
            type="text" 
            placeholder="Buscar gasto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/5 rounded-xl py-2 md:py-3 pl-11 md:pl-12 pr-4 focus:outline-none focus:border-red-500/50 transition-colors text-sm md:text-base"
          />
        </div>
        <div className="flex items-center gap-2 bg-black border border-white/5 rounded-xl px-4 py-2 md:py-3 relative">
          <Tag className="w-4 h-4 text-white/20" />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-black text-sm md:text-base focus:outline-none text-white/60 hover:text-white transition-colors appearance-none pr-8 text-white"
          >
            <option value="Todas" className="bg-black text-white">Todas las categorías</option>
            {expenseCategories.map(cat => (
              <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
        </div>
      </div>

      <div className="bg-black rounded-xl md:rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Descripción</th>
                <th className="hidden md:table-cell px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Categoría</th>
                <th className="hidden md:table-cell px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Fecha</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Monto</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 md:px-6 py-3 md:py-4">
                    <p className="font-semibold text-xs md:text-sm">{expense.description}</p>
                    <div className="md:hidden flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
                      <span>{expense.category}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span>{format(new Date(expense.date), 'dd MMM', { locale: es })}</span>
                        <Calendar className="w-4 h-4 text-orange-500" />
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-white/40" />
                      <span className="text-xs text-white/60">{expense.category}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4">
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                      {format(new Date(expense.date), 'dd MMM, yyyy', { locale: es })}
                      <Calendar className="w-5 h-5 text-orange-500" />
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4">
                    <p className="font-bold text-xs md:text-sm text-red-400">{formatCurrency(expense.amount)}</p>
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                    <button 
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 md:p-2 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/20">
                    No hay gastos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <ExpenseModal 
            categories={expenseCategories}
            onClose={() => setIsModalOpen(false)} 
            onSave={() => {
              setIsModalOpen(false);
              onUpdate();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <CategoryManagementModal 
            type="expense"
            categories={expenseCategories}
            onClose={() => setIsCategoryModalOpen(false)}
            onSave={async (newCategories) => {
              await firebaseService.updateSettings({
                ...data.settings,
                expenseCategories: newCategories
              });
              setIsCategoryModalOpen(false);
              onUpdate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryManagementModal({ 
  type, 
  categories, 
  onClose, 
  onSave 
}: { 
  type: 'product' | 'expense', 
  categories: string[], 
  onClose: () => void, 
  onSave: (cats: string[]) => Promise<void> 
}) {
  const [newCats, setNewCats] = useState<string[]>(categories);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim() && !newCats.includes(input.trim())) {
      setNewCats([...newCats, input.trim()]);
      setInput('');
    }
  };

  const handleRemove = (cat: string) => {
    setNewCats(newCats.filter(c => c !== cat));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md bg-black rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">Gestionar Categorías</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 bg-black border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-orange-500/50 text-sm"
              placeholder="Nueva categoría..."
            />
            <button 
              onClick={handleAdd}
              className="p-3 bg-orange-500 text-black rounded-xl font-bold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {newCats.map(cat => (
              <div key={cat} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm font-medium">{cat}</span>
                <button 
                  onClick={() => handleRemove(cat)}
                  className="p-1 text-white/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={() => onSave(newCats)}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            Guardar Cambios
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ExpenseModal({ categories, onClose, onSave }: { categories: string[], onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<Expense>>({
    description: '',
    category: categories[0] || 'Otros',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await firebaseService.addExpense({
      ...formData,
      id: generateId(),
      ownerUid: uid
    } as Expense);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md bg-black rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5">
          <h2 className="text-lg md:text-xl font-bold">Registrar Gasto</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-4 h-4 md:w-5 md:h-5 text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="space-y-1.5 md:space-y-2">
            <label className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Descripción</label>
            <input 
              required
              type="text" 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-xl py-2.5 md:py-3 px-3 md:px-4 focus:outline-none focus:border-red-500/50 text-sm md:text-base"
              placeholder="Ej: Compra de tela denim"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Categoría</label>
              <div className="relative">
                <select 
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg md:rounded-xl py-2.5 md:py-3 px-3 md:px-4 focus:outline-none focus:border-red-500/50 appearance-none text-sm md:text-base text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Monto</label>
              <input 
                required
                type="number" 
                value={formData.amount === 0 ? '' : formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={e => e.target.select()}
                className="w-full bg-black border border-white/10 rounded-lg md:rounded-xl py-2.5 md:py-3 px-3 md:px-4 focus:outline-none focus:border-red-500/50 text-sm md:text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Fecha</label>
            <input 
              required
              type="date" 
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-lg md:rounded-xl py-2.5 md:py-3 px-3 md:px-4 focus:outline-none focus:border-red-500/50 text-sm md:text-base"
            />
          </div>

          <div className="pt-2 md:pt-4 flex justify-end gap-2 md:gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold text-white/40 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex items-center gap-2 px-6 md:px-8 py-2 md:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg md:rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(239,68,68,0.3)] text-sm md:text-base"
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Guardar Gasto
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
