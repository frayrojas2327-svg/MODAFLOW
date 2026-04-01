import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Package,
  ChevronDown,
  X,
  Save,
  Download,
  Image as ImageIcon,
  Zap,
  Upload,
  LayoutGrid,
  List,
  Calendar,
  CreditCard,
  Wallet,
  Smartphone
} from 'lucide-react';
import { AppState, Product, Category, Variant, Sale, PaymentMethod } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface InventoryProps {
  data: AppState;
  onUpdate: () => void;
  recentlySold: Set<string>;
  setRecentlySold: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export default function Inventory({ data, onUpdate, recentlySold, setRecentlySold }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '6m' | '12m' | 'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [customDays, setCustomDays] = useState<string>('');

  const handleRangeChange = (range: '1d' | '7d' | '30d' | '6m' | '12m' | 'all') => {
    setTimeRange(range);
    setCustomDays('');
    if (range === 'all') return;
    const end = new Date();
    let start = new Date();
    if (range === '1d') start = subDays(end, 1);
    else if (range === '7d') start = subDays(end, 7);
    else if (range === '30d') start = subDays(end, 30);
    else if (range === '6m') start = subMonths(end, 6);
    else if (range === '12m') start = subMonths(end, 12);
    setStartDate(start);
    setEndDate(end);
  };

  const handleCustomDaysChange = (daysStr: string) => {
    setCustomDays(daysStr);
    const days = parseInt(daysStr);
    if (!isNaN(days) && days > 0) {
      const end = new Date();
      const start = subDays(end, days);
      setStartDate(start);
      setEndDate(end);
      setTimeRange('custom');
    }
  };

  const productCategories = data.settings.productCategories;

  const filteredVariants = data.products.flatMap(product => 
    product.variants.map(variant => ({
      ...product,
      variant
    }))
  ).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.design.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.variant.color.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesDate = timeRange === 'all' || isWithinInterval(new Date(item.createdAt), { 
      start: startOfDay(startDate), 
      end: endOfDay(endDate) 
    });
    return matchesSearch && matchesCategory && matchesDate;
  });

  const [processingSale, setProcessingSale] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quickSaleItem, setQuickSaleItem] = useState<{ product: Product, variant: Variant } | null>(null);

  const handleQuickSale = (product: Product, variant: Variant) => {
    if (variant.stock <= 0 || processingSale === variant.id || recentlySold.has(variant.id)) {
      return;
    }
    setQuickSaleItem({ product, variant });
  };

  const completeQuickSale = async (paymentMethod: PaymentMethod) => {
    if (!quickSaleItem) return;
    const { product, variant } = quickSaleItem;

    setProcessingSale(variant.id);
    setQuickSaleItem(null);
    
    try {
      const sale: Sale = {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        size: variant.size,
        color: variant.color,
        quantity: 1,
        price: product.price,
        cost: product.cost,
        discount: 0,
        total: product.price,
        paymentMethod,
        date: new Date().toISOString(),
        ownerUid: auth.currentUser?.uid || ''
      };

      await firebaseService.addSale(sale);
      setRecentlySold(prev => new Set(prev).add(variant.id));
      toast.success(`¡Vendido! (${paymentMethod}) ${product.name} - ${variant.size}`);
      onUpdate();
    } catch (error) {
      console.error('Error in quick sale:', error);
      toast.error('Error al registrar la venta');
    } finally {
      setProcessingSale(null);
    }
  };

  const handleDelete = async (id: string) => {
    await firebaseService.deleteProduct(id);
    setDeleteConfirmId(null);
    onUpdate();
    toast.success('Producto eliminado correctamente');
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Nombre,Categoría,Diseño,Precio,Costo,Stock Total\n"
      + data.products.map(p => {
          const totalStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
          return `${p.name},${p.category},${p.design},${p.price},${p.cost},${totalStock}`;
        }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventario_modaflow.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-white/50 mt-0.5 text-[15px] md:text-[16px]">Gestiona tus productos, tallas y stock.</p>
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
            onClick={handleExport}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-xs md:text-sm font-medium"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden xs:inline">Exportar</span>
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-orange-500 hover:bg-orange-600 text-black rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] text-[16px] md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {(['1d', '7d', '30d', '6m', '12m'] as const).map((range) => (
            <button 
              key={range}
              onClick={() => handleRangeChange(range)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[15px] md:text-[15px] font-bold transition-all uppercase whitespace-nowrap",
                timeRange === range ? "bg-orange-500 text-black" : "text-white/40 hover:text-white"
              )}
            >
              {range}
            </button>
          ))}
          <button 
            onClick={() => handleRangeChange('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[15px] md:text-[15px] font-bold transition-all uppercase whitespace-nowrap",
              timeRange === 'all' ? "bg-orange-500 text-black" : "text-white/40 hover:text-white"
            )}
          >
            Todo
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
          <span className="text-white/40 text-[13px] font-bold uppercase whitespace-nowrap">Días:</span>
          <input 
            type="number"
            min="1"
            placeholder="Ej: 1"
            value={customDays}
            onChange={(e) => handleCustomDaysChange(e.target.value)}
            className="w-12 bg-transparent text-orange-500 font-bold focus:outline-none text-center placeholder:text-white/10"
          />
        </div>
        
        {timeRange !== 'all' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
            <Calendar className="w-6 h-6 text-orange-500" />
            <div className="flex items-center gap-1">
              <input 
                type="date" 
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setStartDate(newDate);
                    setTimeRange('custom' as any);
                  }
                }}
                className="bg-transparent text-[15px] md:text-[15px] font-medium focus:outline-none text-white/60 hover:text-white transition-colors"
              />
              <span className="text-white/20">-</span>
              <input 
                type="date" 
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setEndDate(newDate);
                    setTimeRange('custom' as any);
                  }
                }}
                className="bg-transparent text-[15px] md:text-[15px] font-medium focus:outline-none text-white/60 hover:text-white transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/20" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o diseño..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/5 rounded-xl py-2 md:py-3 pl-11 md:pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-[16px] md:text-base"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {['All', ...productCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 md:px-4 py-1.5 md:py-2 rounded-xl border transition-all whitespace-nowrap text-[15px] md:text-[16px] font-medium",
                selectedCategory === cat 
                  ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
                  : "bg-black border-white/10 text-white/40 hover:text-white hover:border-white/20"
              )}
            >
              {cat === 'All' ? 'Todos' : cat}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-black border border-white/5 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setViewMode('table')}
            className={cn(
              "p-1.5 md:p-2 rounded-lg transition-all",
              viewMode === 'table' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 md:p-2 rounded-lg transition-all",
              viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Table - Desktop */}
      {viewMode === 'table' ? (
        <div className="hidden md:block bg-black rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider">Talla / Color</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider text-center">Acción</th>
                <th className="px-6 py-4 text-[15px] font-bold text-white/40 uppercase tracking-wider">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVariants.map((item) => (
                <tr key={`${item.id}-${item.variant.id}`} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 bg-white/5 rounded-xl overflow-visible border border-white/10 flex items-center justify-center shrink-0 z-0 hover:z-50">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            onClick={() => setSelectedImage(item.imageUrl || null)}
                            className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[2.5] hover:shadow-2xl hover:shadow-black/50 cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-white/20" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[16px]">{item.name}</p>
                        <p className="text-[15px] text-white/40">{item.design}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-white/5 rounded-full text-[15px] font-bold uppercase tracking-wider text-white/60">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[16px]">{formatCurrency(item.price)}</span>
                      <span className="text-[15px] text-white/20">Costo: {formatCurrency(item.cost)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[15px] font-black border border-orange-500/20">{item.variant.size}</span>
                      <span className="text-[15px] text-white/60">{item.variant.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[16px] font-bold",
                        item.variant.stock <= 5 ? "text-orange-500" : "text-white/60"
                      )}>
                        {item.variant.stock}
                      </span>
                      <span className="text-[15px] text-white/20 uppercase tracking-tighter">unid.</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(item.variant.stock > 0 && !recentlySold.has(item.variant.id)) ? (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[15px] font-bold uppercase tracking-widest border border-blue-500/20">
                        No Vendido
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-lg text-[15px] font-bold uppercase tracking-widest border border-green-500/20">
                        Vendido
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickSale(item as Product, item.variant)}
                      disabled={item.variant.stock <= 0 || processingSale === item.variant.id || recentlySold.has(item.variant.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all text-[15px] font-black uppercase tracking-wider mx-auto min-w-[100px] justify-center",
                        (item.variant.stock > 0 && !recentlySold.has(item.variant.id))
                          ? "bg-green-500 hover:bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                          : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5",
                        processingSale === item.variant.id && "animate-pulse opacity-70"
                      )}
                    >
                      {processingSale === item.variant.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      {processingSale === item.variant.id ? '...' : (recentlySold.has(item.variant.id) || item.variant.stock <= 0 ? 'Vendido' : 'Vender')}
                    </motion.button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingProduct(item as Product);
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVariants.map((item) => (
            <motion.div 
              key={`${item.id}-${item.variant.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black border border-white/5 rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all shadow-xl flex flex-col"
            >
              <div className="relative aspect-square bg-white/5 overflow-hidden">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    onClick={() => setSelectedImage(item.imageUrl || null)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-white/10" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[15px] font-bold uppercase tracking-wider text-white/80">
                    {item.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingProduct(item as Product);
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white hover:text-orange-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-[16px] text-white">{item.name}</h3>
                    <p className="text-[15px] text-white/40 uppercase tracking-widest">{item.design}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[16px] text-orange-500">{formatCurrency(item.price)}</p>
                    <p className="text-[15px] text-white/20">Costo: {formatCurrency(item.cost)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-lg text-[15px] font-black border border-orange-500/20">
                    {item.variant.size}
                  </span>
                  <span className="text-[15px] text-white/40 uppercase">{item.variant.color}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={cn(
                      "text-[15px] font-bold",
                      item.variant.stock <= 5 ? "text-orange-500" : "text-white/60"
                    )}>
                      {item.variant.stock}
                    </span>
                    <span className="text-[15px] text-white/20 uppercase">unid.</span>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                {(item.variant.stock > 0 && !recentlySold.has(item.variant.id)) ? (
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[15px] font-bold uppercase tracking-widest border border-blue-500/20">
                      No Vendido
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-lg text-[15px] font-bold uppercase tracking-widest border border-green-500/20">
                      Vendido
                    </span>
                  )}
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQuickSale(item as Product, item.variant)}
                    disabled={item.variant.stock <= 0 || processingSale === item.variant.id || recentlySold.has(item.variant.id)}
                    className={cn(
                      "flex-1 flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all text-[15px] font-black uppercase tracking-wider justify-center",
                      (item.variant.stock > 0 && !recentlySold.has(item.variant.id))
                        ? "bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                        : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5",
                      processingSale === item.variant.id && "animate-pulse opacity-70"
                    )}
                  >
                    {processingSale === item.variant.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    {processingSale === item.variant.id ? '...' : (recentlySold.has(item.variant.id) || item.variant.stock <= 0 ? 'Vendido' : 'Vender')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product List - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredVariants.map((item) => (
          <motion.div 
            key={`${item.id}-${item.variant.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black border border-white/5 rounded-2xl p-4 space-y-4 shadow-xl"
          >
            <div className="flex gap-4">
              <div className="relative w-20 h-20 bg-white/5 rounded-xl overflow-visible border border-white/10 flex items-center justify-center shrink-0 z-0 active:z-50">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    onClick={() => setSelectedImage(item.imageUrl || null)}
                    className="w-full h-full object-cover rounded-xl transition-all duration-300 active:scale-[2] active:shadow-2xl active:shadow-black/50 cursor-zoom-in"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package className="w-8 h-8 text-white/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[16px] text-white truncate">{item.name}</h3>
                    <p className="text-[15px] text-white/40 uppercase tracking-wider">{item.design}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-white/5 rounded-full text-[15px] font-bold uppercase tracking-wider text-white/60">
                    {item.category}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-lg text-[15px] font-black border border-orange-500/20">
                    {item.variant.size}
                  </span>
                  <span className="text-[15px] text-white/40 uppercase">{item.variant.color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
              <div>
                <p className="text-[15px] font-bold text-white/20 uppercase tracking-widest mb-1">Precio</p>
                <p className="font-bold text-[16px] text-white">{formatCurrency(item.price)}</p>
                <p className="text-[15px] text-white/20">Costo: {formatCurrency(item.cost)}</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-white/20 uppercase tracking-widest mb-1">Stock</p>
                <div className="flex items-center justify-end gap-1">
                  <span className={cn(
                    "text-[16px] font-bold",
                    item.variant.stock <= 5 ? "text-orange-500" : "text-white/60"
                  )}>
                    {item.variant.stock}
                  </span>
                  <span className="text-[15px] text-white/20 uppercase">unid.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {(item.variant.stock > 0 && !recentlySold.has(item.variant.id)) ? (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[15px] font-bold uppercase tracking-widest border border-blue-500/20">
                    No Vendido
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-lg text-[15px] font-bold uppercase tracking-widest border border-green-500/20">
                    Vendido
                  </span>
                )}
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingProduct(item as Product);
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickSale(item as Product, item.variant)}
                disabled={item.variant.stock <= 0 || processingSale === item.variant.id || recentlySold.has(item.variant.id)}
                className={cn(
                  "flex-1 flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all text-[15px] font-black uppercase tracking-wider justify-center",
                  (item.variant.stock > 0 && !recentlySold.has(item.variant.id))
                    ? "bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5",
                  processingSale === item.variant.id && "animate-pulse opacity-70"
                )}
              >
                {processingSale === item.variant.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                {processingSale === item.variant.id ? '...' : (recentlySold.has(item.variant.id) || item.variant.stock <= 0 ? 'Vendido' : 'Vender')}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredVariants.length === 0 && (
        <div className="bg-black rounded-2xl border border-white/5 p-12 text-center text-white/20 text-[16px]">
          No se encontraron productos o variantes.
        </div>
      )}

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Zoom"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-black border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">¿Eliminar producto?</h3>
              <p className="text-white/40 text-center text-[16px] mb-8">Esta acción no se puede deshacer y eliminará todas las variantes del producto.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-black font-bold transition-all shadow-[0_0_20px_rgba(239,44,44,0.3)]"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Sale Payment Selector */}
      <AnimatePresence>
        {quickSaleItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Completar Venta</h2>
                  <p className="text-[15px] text-white/40 uppercase tracking-widest mt-1">
                    {quickSaleItem.product.name} • {quickSaleItem.variant.size}
                  </p>
                </div>
                <button 
                  onClick={() => setQuickSaleItem(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-[15px] font-black text-white/40 uppercase tracking-[0.2em]">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Efectivo', icon: Wallet, color: 'bg-green-500' },
                      { id: 'Yape', icon: Smartphone, color: 'bg-purple-600' },
                      { id: 'Plin', icon: Smartphone, color: 'bg-cyan-500' },
                      { id: 'Transferencia', icon: CreditCard, color: 'bg-blue-500' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => completeQuickSale(method.id as PaymentMethod)}
                        className="group relative flex flex-col items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 hover:bg-white/[0.08] transition-all"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg",
                          method.color
                        )}>
                          <method.icon className="w-5 h-5 text-black" />
                        </div>
                        <span className="text-[15px] font-black text-white uppercase tracking-wider">{method.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[15px] text-white/40 font-bold uppercase tracking-widest">Total a Cobrar</span>
                  <span className="text-2xl font-black text-orange-500">{formatCurrency(quickSaleItem.product.price)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ProductModal 
            product={editingProduct} 
            categories={productCategories}
            onClose={() => {
              setIsModalOpen(false);
              setEditingProduct(null);
            }} 
            onSave={() => {
              setIsModalOpen(false);
              setEditingProduct(null);
              onUpdate();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <CategoryManagementModal 
            type="product"
            categories={productCategories}
            onClose={() => setIsCategoryModalOpen(false)}
            onSave={async (newCategories) => {
              await firebaseService.updateSettings({
                ...data.settings,
                productCategories: newCategories
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
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(newCats);
      toast.success('Categorías actualizadas correctamente');
    } catch (error) {
      console.error('Error saving categories:', error);
      toast.error('Error al guardar las categorías');
      setIsSaving(false);
    }
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
              className="flex-1 bg-black border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-orange-500/50 text-[15px]"
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
                <span className="text-[15px] font-medium">{cat}</span>
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
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : null}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSave }: { product: Product | null, categories: string[], onClose: () => void, onSave: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>(product || {
    name: '',
    category: categories[0] || 'Otros',
    design: '',
    imageUrl: '',
    price: 0,
    cost: 0,
    variants: [{ id: generateId(), size: 'M', color: 'Negro', stock: 10 }]
  });

  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [...(formData.variants || []), { id: generateId(), size: '', color: '', stock: 0 }]
    });
  };

  const handleRemoveVariant = (id: string) => {
    setFormData({
      ...formData,
      variants: formData.variants?.filter(v => v.id !== id)
    });
  };

  const handleVariantChange = (id: string, field: keyof Variant, value: any) => {
    setFormData({
      ...formData,
      variants: formData.variants?.map(v => v.id === id ? { ...v, [field]: value } : v)
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('La imagen es demasiado grande. Máximo 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, imageUrl: reader.result as string });
      toast.success('Imagen cargada correctamente');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setIsSaving(true);
    try {
      if (product) {
        await firebaseService.updateProduct({ ...product, ...formData } as Product);
        toast.success('Producto actualizado correctamente');
      } else {
        await firebaseService.addProduct({
          ...formData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          ownerUid: uid
        } as Product);
        toast.success('Producto guardado correctamente');
      }
      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
      setIsSaving(false);
    }
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
        className="relative w-full max-w-2xl bg-black rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5">
          <h2 className="text-lg md:text-xl font-bold">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Nombre</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl py-2.5 md:py-3 px-4 focus:outline-none focus:border-orange-500/50 text-[15px] md:text-[16px]"
                placeholder="Ej: Polo Oversize"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Categoría</label>
              <div className="relative">
                <select 
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl py-2.5 md:py-3 px-4 focus:outline-none focus:border-orange-500/50 appearance-none text-[15px] md:text-[16px] text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Diseño / Colección</label>
              <input 
                type="text" 
                value={formData.design}
                onChange={e => setFormData({ ...formData, design: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl py-2.5 md:py-3 px-4 focus:outline-none focus:border-orange-500/50 text-[15px] md:text-[16px]"
                placeholder="Ej: Verano 2024"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Imagen del Producto</label>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="url" 
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl py-2.5 md:py-3 px-11 focus:outline-none focus:border-orange-500/50 text-[15px] md:text-[16px]"
                    placeholder="URL de la imagen o sube una..."
                  />
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all text-[15px] md:text-[16px] font-bold shrink-0">
                    <Upload className="w-4 h-4 text-orange-500" />
                    Subir
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.imageUrl && (
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl border border-white/10 overflow-hidden bg-white/5 shrink-0">
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Error';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[15px] text-white/20">Puedes pegar una URL o subir una imagen directamente (Máx. 1MB).</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Precio Venta</label>
                <input 
                  required
                  type="number" 
                  value={formData.price === 0 ? '' : formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onFocus={e => e.target.select()}
                  className="w-full bg-black border border-white/10 rounded-xl py-2.5 md:py-3 px-4 focus:outline-none focus:border-orange-500/50 text-[15px] md:text-[16px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Costo Prod.</label>
                <input 
                  required
                  type="number" 
                  value={formData.cost === 0 ? '' : formData.cost}
                  onChange={e => setFormData({ ...formData, cost: e.target.value === '' ? 0 : Number(e.target.value) })}
                  onFocus={e => e.target.select()}
                  className="w-full bg-black border border-white/10 rounded-xl py-2.5 md:py-3 px-4 focus:outline-none focus:border-orange-500/50 text-[15px] md:text-[16px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Variantes (Tallas y Colores)</label>
              <button 
                type="button"
                onClick={handleAddVariant}
                className="text-[15px] md:text-[15px] font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar Variante
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.variants?.map((variant, index) => (
                <div key={variant.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 items-end bg-white/[0.02] p-3 md:p-4 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <span className="text-[15px] md:text-[15px] text-white/30 uppercase">Talla</span>
                    <input 
                      type="text" 
                      value={variant.size}
                      onChange={e => handleVariantChange(variant.id, 'size', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-[15px] md:text-[16px] focus:outline-none focus:border-orange-500/50"
                      placeholder="M, L..."
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[15px] md:text-[15px] text-white/30 uppercase">Color</span>
                    <input 
                      type="text" 
                      value={variant.color}
                      onChange={e => handleVariantChange(variant.id, 'color', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-[15px] md:text-[16px] focus:outline-none focus:border-orange-500/50"
                      placeholder="Negro..."
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[15px] md:text-[15px] text-white/30 uppercase">Stock</span>
                    <input 
                      type="number" 
                      value={variant.stock === 0 ? '' : variant.stock}
                      onChange={e => handleVariantChange(variant.id, 'stock', e.target.value === '' ? 0 : Number(e.target.value))}
                      onFocus={e => e.target.select()}
                      className="w-full bg-black border border-white/10 rounded-lg py-1.5 px-2 text-[15px] md:text-[16px] focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[15px] md:text-[15px] text-white/30 uppercase">Estado</span>
                    <div className="flex bg-black border border-white/10 rounded-lg overflow-hidden p-0.5">
                      <button
                        type="button"
                        onClick={() => handleVariantChange(variant.id, 'stock', Math.max(1, variant.stock))}
                        className={cn(
                          "flex-1 py-1 px-1 text-[12px] font-bold rounded transition-all",
                          variant.stock > 0 ? "bg-blue-500 text-black" : "text-white/40 hover:text-white"
                        )}
                      >
                        DISP.
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVariantChange(variant.id, 'stock', 0)}
                        className={cn(
                          "flex-1 py-1 px-1 text-[12px] font-bold rounded transition-all",
                          variant.stock === 0 ? "bg-green-500 text-black" : "text-white/40 hover:text-white"
                        )}
                      >
                        VEND.
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => handleRemoveVariant(variant.id)}
                      className="p-1.5 md:p-2 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 md:px-6 py-2 md:py-2.5 text-[15px] md:text-[16px] font-bold text-white/40 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 md:px-8 py-2 md:py-2.5 bg-orange-500 hover:bg-orange-600 text-black rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] text-[15px] md:text-[16px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
