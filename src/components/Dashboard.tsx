import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Package,
  Calendar,
  Target,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { AppState, Goal } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { startOfDay, subDays, format, isSameDay, isWithinInterval, endOfDay, subMonths, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';

interface DashboardProps {
  data: AppState;
}

export default function Dashboard({ data }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '12m' | 'custom'>('30d');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Calculate goals progress
  const activeGoals = data.goals.filter(g => isBefore(new Date(), endOfDay(new Date(g.endDate))));
  
  const goalsWithProgress = activeGoals.map(goal => {
    const start = startOfDay(new Date(goal.startDate));
    const end = endOfDay(new Date(goal.endDate));
    
    let current = 0;
    if (goal.type === 'sales') {
      current = data.sales
        .filter(s => isWithinInterval(new Date(s.date), { start, end }))
        .reduce((acc, s) => acc + s.total, 0);
    } else if (goal.type === 'profit') {
      const sales = data.sales
        .filter(s => isWithinInterval(new Date(s.date), { start, end }))
        .reduce((acc, s) => acc + (s.total - (s.cost * s.quantity)), 0);
      const incomes = data.incomes
        .filter(i => isWithinInterval(new Date(i.date), { start, end }))
        .reduce((acc, i) => acc + i.amount, 0);
      const expenses = data.expenses
        .filter(e => isWithinInterval(new Date(e.date), { start, end }))
        .reduce((acc, e) => acc + e.amount, 0);
      current = sales + incomes - expenses;
    }
    return { ...goal, currentAmount: current };
  });

  const handleRangeChange = (range: '7d' | '30d' | '6m' | '12m' | 'custom') => {
    setTimeRange(range);
    if (range === 'custom') {
      setShowCustomDates(true);
      return;
    }
    setShowCustomDates(false);
    const end = new Date();
    let start = new Date();
    if (range === '7d') start = subDays(end, 7);
    else if (range === '30d') start = subDays(end, 30);
    else if (range === '6m') start = subMonths(end, 6);
    else if (range === '12m') start = subMonths(end, 12);
    setStartDate(start);
    setEndDate(end);
  };

  const today = startOfDay(new Date());
  
  // Filter data by date range
  const filteredSales = data.sales.filter(s => 
    isWithinInterval(new Date(s.date), { start: startOfDay(startDate), end: endOfDay(endDate) })
  );
  const filteredExpenses = data.expenses.filter(e => 
    isWithinInterval(new Date(e.date), { start: startOfDay(startDate), end: endOfDay(endDate) })
  );
  const filteredIncomes = data.incomes.filter(i => 
    isWithinInterval(new Date(i.date), { start: startOfDay(startDate), end: endOfDay(endDate) })
  );

  const todaySales = data.sales.filter(s => isSameDay(new Date(s.date), today));
  const todayIncomes = data.incomes.filter(i => isSameDay(new Date(i.date), today));
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0) + todayIncomes.reduce((acc, i) => acc + i.amount, 0);
  
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalCogs = filteredSales.reduce((acc, s) => acc + ((s.cost || 0) * s.quantity), 0);
  const totalOtherIncomes = filteredIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalRevenue = totalSalesRevenue + totalOtherIncomes;
  
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const grossProfit = totalSalesRevenue - totalCogs;
  const netProfit = totalRevenue - totalExpenses - totalCogs;

  const lowStockProducts = data.products.filter(p => 
    p.variants.some(v => v.stock <= 5)
  );

  // Chart data for the selected range
  const daysCount = Math.min(Math.ceil((endOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1, 31);
  const chartData = Array.from({ length: daysCount }).map((_, i) => {
    const date = startOfDay(subDays(endDate, daysCount - 1 - i));
    const daySales = filteredSales.filter(s => isSameDay(new Date(s.date), date));
    const dayOtherIncomes = filteredIncomes.filter(inc => isSameDay(new Date(inc.date), date));
    const dayExpenses = filteredExpenses.filter(e => isSameDay(new Date(e.date), date));
    
    return {
      name: format(date, daysCount > 7 ? 'dd/MM' : 'EEE', { locale: es }),
      ventas: daySales.reduce((acc, s) => acc + s.total, 0) + dayOtherIncomes.reduce((acc, inc) => acc + inc.amount, 0),
      gastos: dayExpenses.reduce((acc, e) => acc + e.amount, 0),
    };
  });

  // Top products for the selected range
  const productSalesMap = filteredSales.reduce((acc, s) => {
    acc[s.productName] = (acc[s.productName] || 0) + s.quantity;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productSalesMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const COLORS = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'];

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">Panel</h1>
          <p className="text-white/40 text-sm font-medium">Resumen de rendimiento de tu marca</p>
        </div>
        
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
            {(['7d', '30d', '6m', '12m', 'custom'] as const).map((range) => (
              <button 
                key={range}
                onClick={() => handleRangeChange(range)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black transition-all uppercase whitespace-nowrap",
                  timeRange === range ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "text-white/40 hover:text-white"
                )}
              >
                {range === 'custom' ? 'Personalizado' : range}
              </button>
            ))}
          </div>

          {showCustomDates && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10"
            >
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500" />
                <input 
                  type="date" 
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="w-full bg-black border border-white/5 rounded-xl py-1.5 pl-9 pr-2 text-[10px] font-black uppercase text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <span className="text-white/20 font-black text-[10px]">A</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500" />
                <input 
                  type="date" 
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className="w-full bg-black border border-white/5 rounded-xl py-1.5 pl-9 pr-2 text-[10px] font-black uppercase text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <StatCard 
          title="Ingresos" 
          value={formatCurrency(totalRevenue)} 
          icon={TrendingUp} 
          trend="Total del periodo" 
          color="orange"
          description="Ventas + Otros ingresos"
        />
        <StatCard 
          title="Gastos" 
          value={formatCurrency(totalExpenses + totalCogs)} 
          icon={TrendingDown} 
          trend="Total del periodo" 
          color="red"
          description="Costos + Gastos operativos"
        />
        <StatCard 
          title="Balance" 
          value={formatCurrency(netProfit)} 
          icon={DollarSign} 
          trend={netProfit >= 0 ? "Ganancia neta" : "Pérdida neta"} 
          color={netProfit >= 0 ? "green" : "red"}
          description="Resultado final"
          isMain
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-black p-5 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-lg font-black uppercase tracking-tight italic">Rendimiento</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ventas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/20"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Gastos</span>
              </div>
            </div>
          </div>
          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#ffffff20', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                  interval={daysCount > 7 ? 4 : 0}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#ffffff20', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `S/${value}`}
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#F97316" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="#ffffff10" 
                  strokeWidth={2}
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-black p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
          <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-8">Productos más vendidos</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#ffffff60', fontSize: 15 }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Goals Widget */}
        <div className="bg-black p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 md:w-5 h-5 text-orange-500" />
              Metas Activas
            </h3>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'goals' }))}
              className="text-[14px] font-bold text-orange-500 hover:text-orange-400 transition-colors"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {goalsWithProgress.length > 0 ? (
              goalsWithProgress.slice(0, 3).map(goal => {
                const progress = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white/80">{goal.title}</span>
                      <span className="text-orange-500 font-bold">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          progress >= 100 ? "bg-green-500" : "bg-orange-500"
                        )}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest font-bold">
                      <span>{formatCurrency(goal.currentAmount)}</span>
                      <span>Meta: {formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-white/20 italic">
                No hay metas activas.
              </div>
            )}
          </div>
        </div>

        <div className="bg-black p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 md:w-5 h-5 text-orange-500" />
              Alertas de Stock Bajo
            </h3>
            <span className="text-[15px] md:text-[15px] text-white/40">{lowStockProducts.length} productos</span>
          </div>
          <div className="space-y-3 md:space-y-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 3).map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-[16px]">{product.name}</p>
                      <p className="text-[15px] text-white/40">{product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-orange-500">Stock Crítico</p>
                    <p className="text-[15px] text-white/40">
                      {product.variants.reduce((acc, v) => acc + v.stock, 0)} unidades
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/20">
                No hay alertas de stock actualmente.
              </div>
            )}
          </div>
        </div>

        <div className="bg-black p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold">Ventas Recientes</h3>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'sales' }))}
              className="text-[14px] font-bold text-orange-500 hover:text-orange-400 transition-colors"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-3 md:space-y-4">
            {data.sales.slice(-3).reverse().map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold border border-white/10">
                    {sale.size}
                  </div>
                  <div>
                    <p className="font-bold text-[16px]">{sale.productName}</p>
                    <div className="flex items-center gap-1.5 text-[14px] text-white/40">
                      <span>{format(new Date(sale.date), 'HH:mm')}</span>
                      <span>•</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[12px] font-bold",
                        sale.paymentMethod === 'Efectivo' ? "bg-green-500/10 text-green-500" :
                        sale.paymentMethod === 'Transferencia' ? "bg-blue-500/10 text-blue-500" :
                        "bg-purple-500/10 text-purple-500"
                      )}>
                        {sale.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-[16px] text-orange-500">{formatCurrency(sale.total)}</p>
                  <p className="text-[13px] text-white/30">{format(new Date(sale.date), 'dd MMM', { locale: es })}</p>
                </div>
              </div>
            ))}
            {data.sales.length === 0 && (
              <div className="text-center py-8 text-white/20 italic">
                No hay ventas registradas aún.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, description, isMain }: any) {
  const colorClasses: any = {
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    green: "text-green-500 bg-green-500/10 border-green-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className={cn(
      "p-6 md:p-8 rounded-[2.5rem] border transition-all group relative overflow-hidden",
      isMain ? "bg-orange-500 border-orange-400" : "bg-black border-white/5 hover:border-white/10"
    )}>
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className={cn("w-20 h-20", isMain ? "text-black" : "text-white")} />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className={cn(
          "p-3 rounded-2xl border", 
          isMain ? "bg-black/20 border-black/10 text-black" : colorClasses[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={cn(
          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
          isMain ? "bg-black/20 border-black/10 text-black" : colorClasses[color]
        )}>
          {trend}
        </span>
      </div>

      <div className="space-y-1">
        <p className={cn(
          "text-[11px] font-black uppercase tracking-[0.2em]",
          isMain ? "text-black/60" : "text-white/30"
        )}>
          {title}
        </p>
        <h4 className={cn(
          "text-3xl md:text-4xl font-black tracking-tighter",
          isMain ? "text-black" : "text-white group-hover:text-orange-500 transition-colors"
        )}>
          {value}
        </h4>
        {description && (
          <p className={cn(
            "text-[10px] font-medium mt-2",
            isMain ? "text-black/40" : "text-white/20"
          )}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
