import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Save, 
  Building2, 
  Package, 
  TrendingDown,
  TrendingUp,
  X,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { AppState, UserSettings } from '../types';
import { firebaseService } from '../services/firebaseService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsProps {
  data: AppState;
  userProfile: any;
  onUpdate: () => void;
}

export default function Settings({ data, userProfile, onUpdate }: SettingsProps) {
  const [companyName, setCompanyName] = useState(userProfile?.companyName || '');
  const [productCategories, setProductCategories] = useState<string[]>(data.settings.productCategories || []);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(data.settings.expenseCategories || []);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(data.settings.incomeCategories || []);
  const [newProductCat, setNewProductCat] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state with props when they change (e.g., after loading from Firebase)
  useEffect(() => {
    if (userProfile?.companyName) {
      setCompanyName(userProfile.companyName);
    }
  }, [userProfile?.companyName]);

  useEffect(() => {
    if (data.settings.productCategories?.length > 0) {
      setProductCategories(data.settings.productCategories);
    }
  }, [data.settings.productCategories]);

  useEffect(() => {
    if (data.settings.expenseCategories?.length > 0) {
      setExpenseCategories(data.settings.expenseCategories);
    }
  }, [data.settings.expenseCategories]);

  useEffect(() => {
    if (data.settings.incomeCategories?.length > 0) {
      setIncomeCategories(data.settings.incomeCategories);
    }
  }, [data.settings.incomeCategories]);

  const handleAddProductCat = () => {
    if (newProductCat.trim() && !productCategories.includes(newProductCat.trim())) {
      setProductCategories([...productCategories, newProductCat.trim()]);
      setNewProductCat('');
    }
  };

  const handleRemoveProductCat = (cat: string) => {
    setProductCategories(productCategories.filter(c => c !== cat));
  };

  const handleAddExpenseCat = () => {
    if (newExpenseCat.trim() && !expenseCategories.includes(newExpenseCat.trim())) {
      setExpenseCategories([...expenseCategories, newExpenseCat.trim()]);
      setNewExpenseCat('');
    }
  };

  const handleRemoveExpenseCat = (cat: string) => {
    setExpenseCategories(expenseCategories.filter(c => c !== cat));
  };

  const handleAddIncomeCat = () => {
    if (newIncomeCat.trim() && !incomeCategories.includes(newIncomeCat.trim())) {
      setIncomeCategories([...incomeCategories, newIncomeCat.trim()]);
      setNewIncomeCat('');
    }
  };

  const handleRemoveIncomeCat = (cat: string) => {
    setIncomeCategories(incomeCategories.filter(c => c !== cat));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update profile
      await firebaseService.updateUserProfile({
        ...userProfile,
        companyName: companyName.trim()
      });

      // Update settings
      await firebaseService.updateSettings({
        productCategories,
        expenseCategories,
        incomeCategories
      });

      toast.success('Configuración guardada correctamente');
      onUpdate();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await firebaseService.resetUserData();
      toast.success('Todos los datos han sido reiniciados');
      setShowResetConfirm(false);
      onUpdate();
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Error al reiniciar los datos');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            Configuración
          </h1>
          <p className="text-white/50 mt-0.5 text-xs md:text-sm">Personaliza tu marca y categorías de negocio.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] text-sm md:text-base"
        >
          <Save className="w-4 h-4 md:w-5 md:h-5" />
          {isSaving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Info */}
        <section className="bg-black p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Building2 className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Información de Marca</h2>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nombre de tu Emprendimiento</label>
            <input 
              type="text" 
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50 text-sm"
              placeholder="Ej: ModaFlow Store"
            />
          </div>
        </section>

        {/* Product Categories */}
        <section className="bg-black p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Package className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Categorías de Productos</h2>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newProductCat}
              onChange={e => setNewProductCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddProductCat()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-orange-500/50 text-sm"
              placeholder="Nueva categoría..."
            />
            <button 
              onClick={handleAddProductCat}
              className="p-2 bg-orange-500 text-black rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {productCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full group">
                <span className="text-xs">{cat}</span>
                <button 
                  onClick={() => handleRemoveProductCat(cat)}
                  className="text-white/20 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Expense Categories */}
        <section className="bg-black p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <TrendingDown className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Categorías de Gastos</h2>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newExpenseCat}
              onChange={e => setNewExpenseCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddExpenseCat()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-orange-500/50 text-sm"
              placeholder="Nueva categoría..."
            />
            <button 
              onClick={handleAddExpenseCat}
              className="p-2 bg-orange-500 text-black rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full group">
                <span className="text-xs">{cat}</span>
                <button 
                  onClick={() => handleRemoveExpenseCat(cat)}
                  className="text-white/20 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Income Categories */}
        <section className="bg-black p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Categorías de Ingresos</h2>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newIncomeCat}
              onChange={e => setNewIncomeCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddIncomeCat()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 focus:outline-none focus:border-green-500/50 text-sm"
              placeholder="Nueva categoría..."
            />
            <button 
              onClick={handleAddIncomeCat}
              className="p-2 bg-green-500 text-black rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {incomeCategories.map(cat => (
              <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full group">
                <span className="text-xs">{cat}</span>
                <button 
                  onClick={() => handleRemoveIncomeCat(cat)}
                  className="text-white/20 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Danger Zone */}
      <section className="bg-black p-6 rounded-2xl border border-red-500/10 shadow-xl space-y-6">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-bold uppercase tracking-wider text-xs">Zona de Peligro</h2>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
          <div>
            <h3 className="font-bold text-sm">Reiniciar todos los datos</h3>
            <p className="text-xs text-white/40 mt-1">
              Esta acción eliminará todos tus productos, ventas, gastos e ingresos de forma permanente.
            </p>
          </div>
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black rounded-xl transition-all font-bold text-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            Reiniciar a Cero
          </button>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isResetting && setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-black rounded-3xl border border-white/10 p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">¿Estás absolutamente seguro?</h2>
                <p className="text-white/40 mt-2">
                  Esta acción es irreversible. Se borrarán todos tus registros de inventario y finanzas.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleReset}
                  disabled={isResetting}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black rounded-2xl font-black transition-all flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Reiniciando...
                    </>
                  ) : (
                    'Sí, borrar todo permanentemente'
                  )}
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
