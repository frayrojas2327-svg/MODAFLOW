import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Smartphone,
  CheckCircle2,
  X
} from 'lucide-react';
import { AppState, Product, Variant, Sale, PaymentMethod } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface SalesProps {
  data: AppState;
  onUpdate: () => void;
}

interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
}

export default function Sales({ data, onUpdate }: SalesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaleSummary, setLastSaleSummary] = useState<{ total: number, method: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyPaymentMethod, setHistoryPaymentMethod] = useState<string>('Todos');
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const productCategories = data.settings.productCategories;

  const filteredProducts = data.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.design.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredSales = data.sales
    .filter(s => {
      const matchesSearch = s.productName.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
                           (s.notes && s.notes.toLowerCase().includes(historySearchTerm.toLowerCase()));
      const matchesMethod = historyPaymentMethod === 'Todos' || s.paymentMethod === historyPaymentMethod;
      return matchesSearch && matchesMethod;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const addToCart = (product: Product, variant: Variant) => {
    const existingItem = cart.find(item => item.variant.id === variant.id);
    if (existingItem) {
      if (existingItem.quantity < variant.stock) {
        setCart(cart.map(item => 
          item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      }
    } else {
      setCart([...cart, { product, variant, quantity: 1 }]);
    }
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter(item => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.variant.id === variantId) {
        const newQty = Math.max(1, Math.min(item.variant.stock, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const finalTotal = Math.max(0, total - discount);

  const clearCart = () => {
    if (cart.length > 0 && confirm('¿Estás seguro de vaciar el carrito?')) {
      setCart([]);
      setDiscount(0);
      setNotes('');
    }
  };

  const handleCheckout = async () => {
    if (isProcessing) return;
    
    if (cart.length === 0) {
      toast.error("El carrito está vacío. Agrega productos antes de finalizar la venta.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast.error("Debes iniciar sesión para realizar una venta.");
      return;
    }

    setIsProcessing(true);
    const saleTotal = finalTotal;
    const saleMethod = paymentMethod;

    try {
      for (const item of cart) {
        const sale: Sale = {
          id: generateId(),
          productId: item.product.id,
          productName: item.product.name,
          variantId: item.variant.id,
          size: item.variant.size,
          color: item.variant.color,
          quantity: item.quantity,
          price: item.product.price,
          cost: item.product.cost,
          discount: discount / cart.length, // Distribute discount roughly
          total: (item.product.price * item.quantity) - (discount / cart.length),
          paymentMethod,
          notes: notes,
          date: new Date().toISOString(),
          ownerUid: uid
        };
        await firebaseService.addSale(sale);
      }

      setLastSaleSummary({ total: saleTotal, method: saleMethod });
      setCart([]);
      setDiscount(0);
      setNotes('');
      setIsSuccessModalOpen(true);
      onUpdate();
    } catch (error) {
      console.error("Error processing sale:", error);
      toast.error("Error al procesar la venta. Por favor, intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">Ventas</h1>
          <p className="text-white/40 text-sm font-medium">Registro y control de transacciones</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveTab('new')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-widest",
              activeTab === 'new' ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "text-white/40 hover:text-white"
            )}
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-widest",
              activeTab === 'history' ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "text-white/40 hover:text-white"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            Historial
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 h-full">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text" 
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-sm font-medium"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['Todas', ...productCategories].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        selectedCategory === cat 
                          ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
                          : "bg-black border-white/10 text-white/40 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-1 custom-scrollbar">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-black p-5 rounded-[2rem] border border-white/5 space-y-4 hover:border-orange-500/20 transition-all group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">{product.name}</h3>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{product.category} • {product.design}</p>
                    </div>
                    <span className="text-orange-500 font-black text-lg tracking-tighter">{formatCurrency(product.price)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map(variant => (
                      <button
                        key={variant.id}
                        disabled={variant.stock <= 0}
                        onClick={() => addToCart(product, variant)}
                        className={cn(
                          "flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl border transition-all min-w-[65px]",
                          variant.stock <= 0 
                            ? "bg-black border-white/5 opacity-20 cursor-not-allowed" 
                            : "bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10"
                        )}
                      >
                        <span className="text-xs font-black uppercase tracking-widest">{variant.size}</span>
                        <span className="text-[9px] font-black text-white/30">{variant.stock} U.</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart / Checkout */}
          <div className="bg-black rounded-2xl md:rounded-3xl border border-white/5 flex flex-col shadow-2xl h-fit lg:sticky lg:top-10">
            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                Carrito
              </h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-white/5 rounded-lg text-[15px] md:text-[15px] font-bold text-white/40">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)} items
                </span>
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-500 transition-colors"
                    title="Vaciar Carrito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 md:p-6 space-y-3 md:space-y-4 max-h-[300px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
              {cart.map(item => (
                <div key={item.variant.id} className="flex items-center justify-between gap-3 md:gap-4 group">
                  <div className="flex-1">
                    <p className="text-[15px] md:text-[16px] font-bold">{item.product.name}</p>
                    <p className="text-[15px] md:text-[15px] text-white/40">{item.variant.size} • {item.variant.color}</p>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center bg-white/5 rounded-lg border border-white/5">
                      <button 
                        onClick={() => updateQuantity(item.variant.id, -1)}
                        className="p-1 hover:text-orange-500 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[15px] md:text-[15px] font-bold w-5 md:w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.variant.id, 1)}
                        className="p-1 hover:text-orange-500 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.variant.id)}
                      className="p-1 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-8 md:py-12 text-white/20 text-[15px] md:text-[16px]">
                  El carrito está vacío.
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 border-t border-white/5 bg-white/[0.02] space-y-4 md:space-y-6">
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[15px] md:text-[15px] font-bold text-white/40 uppercase tracking-wider">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Efectivo', icon: Wallet },
                      { id: 'Transferencia', icon: CreditCard },
                      { id: 'Yape', icon: Smartphone },
                      { id: 'Plin', icon: Smartphone },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                        className={cn(
                          "flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl border text-[15px] md:text-[15px] font-medium transition-all",
                          paymentMethod === method.id 
                            ? "bg-orange-500 text-black border-orange-500 font-bold" 
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        )}
                      >
                        <method.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        {method.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[15px] font-bold text-white/40 uppercase tracking-wider">Descuento (S/)</label>
                    <input 
                      type="number"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-orange-500/50 text-[15px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[15px] font-bold text-white/40 uppercase tracking-wider">Notas</label>
                    <input 
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Cliente frecuente"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-orange-500/50 text-[15px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center justify-between text-white/40 text-[15px] md:text-[16px]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-red-400 text-[15px] md:text-[16px]">
                    <span>Descuento</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 md:pt-2 border-t border-white/5">
                  <span className="font-bold text-[15px] md:text-[16px]">Total</span>
                  <span className="text-lg md:text-xl font-black text-orange-500">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <button 
                disabled={isProcessing}
                onClick={handleCheckout}
                className={cn(
                  "w-full py-3 md:py-4 bg-orange-500 hover:bg-orange-600 text-black rounded-xl md:rounded-2xl transition-all font-black text-base md:text-lg shadow-[0_0_30px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Finalizar Venta'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="text" 
                  placeholder="Buscar en historial..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-sm font-medium"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {['Todos', 'Efectivo', 'Transferencia', 'Yape', 'Plin'].map(method => (
                  <button
                    key={method}
                    onClick={() => setHistoryPaymentMethod(method)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      historyPaymentMethod === method 
                        ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
                        : "bg-black border-white/10 text-white/40 hover:text-white"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:hidden divide-y divide-white/5">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">
                      {format(new Date(sale.date), "d MMM, HH:mm", { locale: es })}
                    </p>
                    <h4 className="font-black text-lg uppercase italic tracking-tighter leading-tight">{sale.productName}</h4>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">{sale.size} • {sale.color}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-orange-500 tracking-tighter">{formatCurrency(sale.total)}</p>
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest mt-1",
                      sale.paymentMethod === 'Efectivo' ? "bg-green-500/10 text-green-500" :
                      sale.paymentMethod === 'Transferencia' ? "bg-blue-500/10 text-blue-500" :
                      "bg-purple-500/10 text-purple-500"
                    )}>
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>
                {sale.notes && (
                  <p className="text-[11px] text-white/30 italic bg-white/[0.02] p-2 rounded-lg border border-white/5">{sale.notes}</p>
                )}
                <div className="flex justify-end">
                  <button 
                    onClick={() => setSaleToDelete(sale)}
                    className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <div className="p-20 text-center text-white/20 text-sm font-black uppercase tracking-[0.2em]">
                Sin registros
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[13px] uppercase tracking-wider text-white/40 border-b border-white/5">
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Producto</th>
                  <th className="px-6 py-4 font-bold">Detalle</th>
                  <th className="px-6 py-4 font-bold">Cant.</th>
                  <th className="px-6 py-4 font-bold">Precio</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Pago</th>
                  <th className="px-6 py-4 font-bold">Notas</th>
                  <th className="px-6 py-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[15px] font-medium">{new Date(sale.date).toLocaleDateString()}</div>
                      <div className="text-[13px] text-white/30">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] font-bold">{sale.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-white/5 rounded text-[13px] font-bold text-white/60">
                        {sale.size} • {sale.color}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[15px]">{sale.quantity}</td>
                    <td className="px-6 py-4 text-[15px]">{formatCurrency(sale.price)}</td>
                    <td className="px-6 py-4 text-[15px] font-black text-orange-500">{formatCurrency(sale.total)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[13px] font-bold",
                        sale.paymentMethod === 'Efectivo' ? "bg-green-500/10 text-green-500" :
                        sale.paymentMethod === 'Transferencia' ? "bg-blue-500/10 text-blue-500" :
                        "bg-purple-500/10 text-purple-500"
                      )}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] text-white/40 italic max-w-[150px] truncate" title={sale.notes}>
                        {sale.notes || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSaleToDelete(sale)}
                        className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-lg transition-all"
                        title="Eliminar venta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center text-white/20 italic">
                      No se encontraron ventas en el historial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-black rounded-3xl border border-white/10 p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">¡Venta Exitosa!</h2>
                <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-[15px]">
                    <span className="text-white/40">Total Pagado:</span>
                    <span className="font-bold text-orange-500">{formatCurrency(lastSaleSummary?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[15px]">
                    <span className="text-white/40">Método:</span>
                    <span className="font-bold">{lastSaleSummary?.method}</span>
                  </div>
                </div>
                <p className="text-white/40 mt-4 text-[15px]">El inventario ha sido actualizado automáticamente.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    setActiveTab('history');
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 text-[15px]"
                >
                  Ver Historial
                </button>
                <button 
                  onClick={() => setIsSuccessModalOpen(false)}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 text-[15px]"
                >
                  Nueva Venta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {saleToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaleToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-black rounded-3xl border border-white/10 p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">¿Eliminar Venta?</h2>
                <p className="text-white/40 mt-4 text-[15px]">
                  Esta acción restaurará el stock del producto automáticamente. ¿Deseas continuar?
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSaleToDelete(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (saleToDelete) {
                      try {
                        await firebaseService.deleteSale(saleToDelete);
                        toast.success('Venta eliminada');
                        setSaleToDelete(null);
                        onUpdate();
                      } catch (error) {
                        toast.error('Error al eliminar');
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
