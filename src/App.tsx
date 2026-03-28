import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingDown, 
  TrendingUp,
  BarChart3, 
  Menu, 
  X,
  LogOut,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Expenses from './components/Expenses';
import Incomes from './components/Incomes';
import Finances from './components/Finances';
import Settings from './components/Settings';
import Login from './components/Login';
import Logo from './components/Logo';
import { auth, signOut, onAuthStateChanged, User, db, doc, onSnapshot } from './firebase';
import { firebaseService } from './services/firebaseService';
import { AppState, Product, Sale, Expense, Income } from './types';

type View = 'dashboard' | 'inventory' | 'sales' | 'expenses' | 'incomes' | 'finances' | 'settings';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [data, setData] = useState<AppState>({
    products: [],
    sales: [],
    expenses: [],
    incomes: [],
    settings: {
      productCategories: ['Polos', 'Poleras', 'Pantalones', 'Accesorios', 'Otros'],
      expenseCategories: ['Producción', 'Publicidad', 'Envíos', 'Materiales', 'Otros'],
      incomeCategories: ['Ventas Extra', 'Inversión', 'Devoluciones', 'Otros']
    }
  });

  const handleUpdate = () => {
    // This can be used to trigger a refresh if needed, 
    // but onSnapshot handles it for Firebase.
    // For Demo Mode, it's just a placeholder.
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setIsDemoMode(false);
        setUser(currentUser);
        
        // Subscribe to profile info
        unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile(snapshot.data());
          }
          
          // Only show welcome toast once per session
          if (!hasShownWelcome) {
            toast.success('¡Bienvenido a ModaFlow!', {
              description: 'Gracias por estar aquí y mejorar tu control financiero. ¡Vamos a hacer crecer tu marca!',
              duration: 5000,
            });
            setHasShownWelcome(true);
          }
        }, (error) => {
          console.error('Error fetching profile:', error);
        });
      } else if (!isDemoMode) {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setUserProfile(null);
        setHasShownWelcome(false);
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, [hasShownWelcome, isDemoMode]);

  useEffect(() => {
    if (!user) return;

    // If it's a mock user, we load mock data
    if (user.isMock) {
      const mockProducts: Product[] = [
        { id: '1', name: 'Polo Oversize', category: 'Polos', design: 'Minimal', price: 45, cost: 20, variants: [{ id: 'v1', size: 'M', color: 'Negro', stock: 15 }], createdAt: new Date().toISOString(), ownerUid: user.uid },
        { id: '2', name: 'Hoodie Essential', category: 'Poleras', design: 'Logo', price: 85, cost: 40, variants: [{ id: 'v2', size: 'L', color: 'Gris', stock: 8 }], createdAt: new Date().toISOString(), ownerUid: user.uid },
      ];
      const mockSales: Sale[] = [
        { id: 's1', productId: '1', productName: 'Polo Oversize', variantId: 'v1', size: 'M', color: 'Negro', quantity: 2, price: 45, cost: 20, discount: 0, total: 90, paymentMethod: 'Yape', date: new Date().toISOString(), ownerUid: user.uid },
      ];
      setData({ 
        products: mockProducts, 
        sales: mockSales, 
        expenses: [], 
        incomes: [],
        settings: {
          productCategories: ['Polos', 'Poleras', 'Pantalones', 'Accesorios', 'Otros'],
          expenseCategories: ['Producción', 'Publicidad', 'Envíos', 'Materiales', 'Otros'],
          incomeCategories: ['Ventas Extra', 'Inversión', 'Devoluciones', 'Otros']
        }
      });
      return;
    }

    const unsubProducts = firebaseService.subscribeProducts((products) => {
      setData(prev => ({ ...prev, products }));
    });
    const unsubSales = firebaseService.subscribeSales((sales) => {
      setData(prev => ({ ...prev, sales }));
    });
    const unsubExpenses = firebaseService.subscribeExpenses((expenses) => {
      setData(prev => ({ ...prev, expenses }));
    });
    const unsubIncomes = firebaseService.subscribeIncomes((incomes) => {
      setData(prev => ({ ...prev, incomes }));
    });
    const unsubSettings = firebaseService.subscribeSettings((settings) => {
      setData(prev => ({ ...prev, settings }));
    });

    return () => {
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubIncomes();
      unsubSettings();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      if (user?.isMock) {
        setUser(null);
        setIsDemoMode(false);
      } else {
        await signOut(auth);
      }
      toast.info('Sesión cerrada');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  const handleDemoLogin = () => {
    const mockUser = {
      uid: 'demo-user-123',
      displayName: 'Usuario Demo',
      email: 'demo@modaflow.com',
      photoURL: 'https://ui-avatars.com/api/?name=Demo+User',
      isMock: true
    };
    setUser(mockUser);
    setIsDemoMode(true);
    toast.info('Ingresando en modo demostración', {
      description: 'Los cambios no se guardarán en la nube.'
    });
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-center" theme="dark" />
        <Login onDemoLogin={handleDemoLogin} />
      </>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart },
    { id: 'incomes', label: 'Ingresos', icon: TrendingUp },
    { id: 'expenses', label: 'Gastos', icon: TrendingDown },
    { id: 'finances', label: 'Finanzas', icon: BarChart3 },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
        <Toaster position="top-right" theme="dark" richColors />
        
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-3 border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50">
          <Logo iconClassName="w-7 h-7" className="gap-2" />
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-[60] w-64 md:w-72 bg-black border-r border-white/5 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex flex-col h-full p-4 md:p-6">
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <Logo iconClassName="w-8 h-8 md:w-10 md:h-10" />
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1.5 hover:bg-white/5 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 md:mb-8 p-3 md:p-4 bg-black rounded-xl md:rounded-2xl border border-white/10 flex items-center gap-2 md:gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt={user.displayName || ''} 
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <p className="text-xs md:text-sm font-bold truncate">{userProfile?.companyName || user.displayName || 'Mi Marca'}</p>
                  <p className="text-[9px] md:text-[10px] text-white/40 truncate">{user.email}</p>
                </div>
              </div>

              <nav className="flex-1 space-y-1 md:space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as View);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-lg md:rounded-xl transition-all duration-200 group text-sm md:text-base",
                      activeView === item.id 
                        ? "bg-orange-500 text-black font-semibold shadow-[0_0_15px_rgba(249,115,22,0.2)]" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 md:w-5 md:h-5", activeView === item.id ? "text-black" : "text-white/40 group-hover:text-white/80")} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="pt-4 md:pt-6 border-t border-white/5 space-y-1 md:space-y-2">
                <button 
                  onClick={() => {
                    setActiveView('settings');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl transition-all text-sm md:text-base",
                    activeView === 'settings' 
                      ? "bg-orange-500 text-black font-semibold shadow-[0_0_15px_rgba(249,115,22,0.2)]" 
                      : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                >
                  <SettingsIcon className={cn("w-4 h-4 md:w-5 md:h-5", activeView === 'settings' ? "text-black" : "text-white/40")} />
                  Configuración
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all text-sm md:text-base"
                >
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-screen p-3 md:p-6 lg:p-8 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeView === 'dashboard' && <Dashboard data={data} />}
                {activeView === 'inventory' && <Inventory data={data} onUpdate={handleUpdate} />}
                {activeView === 'sales' && <Sales data={data} onUpdate={handleUpdate} />}
                {activeView === 'incomes' && <Incomes data={data} onUpdate={handleUpdate} />}
                {activeView === 'expenses' && <Expenses data={data} onUpdate={handleUpdate} />}
                {activeView === 'finances' && <Finances data={data} />}
                {activeView === 'settings' && <Settings data={data} userProfile={userProfile} onUpdate={handleUpdate} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
