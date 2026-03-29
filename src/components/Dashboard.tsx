import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Package,
  Calendar
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
import { AppState } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { startOfDay, subDays, format, isSameDay, isWithinInterval, endOfDay, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  data: AppState;
}

export default function Dashboard({ data }: DashboardProps) {
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
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-white/50 text-[15px] md:text-[16px] mt-0.5 md:mt-1">Bienvenido de nuevo. Aquí está el resumen de tu negocio.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {(['7d', '30d', '6m', '12m'] as const).map((range) => (
              <button 
                key={range}
                onClick={() => handleRangeChange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[15px] md:text-[15px] font-bold transition-all uppercase",
                  timeRange === range ? "bg-orange-500 text-black" : "text-white/40 hover:text-white"
                )}
              >
                {range}
              </button>
            ))}
            <button 
              onClick={() => setTimeRange('custom')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[15px] md:text-[15px] font-bold transition-all uppercase",
                timeRange === 'custom' ? "bg-orange-500 text-black" : "text-white/40 hover:text-white"
              )}
            >
              Personalizado
            </button>
          </div>
          
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
                    setTimeRange('custom');
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
                    setTimeRange('custom');
                  }
                }}
                className="bg-transparent text-[15px] md:text-[15px] font-medium focus:outline-none text-white/60 hover:text-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          title="Ventas del Día" 
          value={formatCurrency(todayRevenue)} 
          icon={TrendingUp} 
          trend="+12%" 
          color="orange"
        />
        <StatCard 
          title="Ganancia Bruta" 
          value={formatCurrency(grossProfit)} 
          icon={DollarSign} 
          trend="+5.4%" 
          color="green"
        />
        <StatCard 
          title="Costo de Ventas" 
          value={formatCurrency(totalCogs)} 
          icon={TrendingDown} 
          trend="-2.1%" 
          color="red"
        />
        <StatCard 
          title="Ganancia Neta" 
          value={formatCurrency(netProfit)} 
          icon={TrendingUp} 
          trend="+8.2%" 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-black p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <h3 className="text-base md:text-lg font-semibold">Rendimiento {timeRange === '7d' ? 'Semanal' : 'del Periodo'}</h3>
            <div className="flex items-center gap-3 md:gap-4 text-[15px] md:text-[15px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-white/60">Ventas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <span className="text-white/60">Gastos</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
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
                  tick={{ fill: '#ffffff40', fontSize: 15 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#ffffff40', fontSize: 15 }}
                  tickFormatter={(value) => `S/${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#F97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="#ffffff20" 
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
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
              lowStockProducts.map(product => (
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
          <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">Ventas Recientes</h3>
          <div className="space-y-3 md:space-y-4">
            {data.sales.slice(-5).reverse().map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold">
                    {sale.size}
                  </div>
                  <div>
                    <p className="font-medium text-[16px]">{sale.productName}</p>
                    <div className="flex items-center gap-1.5 text-[15px] text-white/40">
                      <span>{format(new Date(sale.date), 'HH:mm')}</span>
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>•</span>
                      <span>{sale.paymentMethod}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[16px]">{formatCurrency(sale.total)}</p>
                  <p className="text-[15px] text-green-500">Completada</p>
                </div>
              </div>
            ))}
            {data.sales.length === 0 && (
              <div className="text-center py-8 text-white/20">
                No hay ventas registradas aún.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colorClasses: any = {
    orange: "bg-orange-500/10 text-orange-500",
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    blue: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="bg-black p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className={cn("p-2 md:p-2.5 rounded-xl", colorClasses[color])}>
          <Icon className="w-4 h-4 md:w-5 h-5" />
        </div>
        <span className={cn("text-[15px] md:text-[15px] font-bold px-2 py-0.5 md:py-1 rounded-full", colorClasses[color])}>
          {trend}
        </span>
      </div>
      <p className="text-white/40 text-[15px] md:text-[16px] font-medium">{title}</p>
      <h4 className="text-xl md:text-2xl font-bold mt-0.5 md:mt-1 group-hover:text-orange-500 transition-colors">{value}</h4>
    </div>
  );
}
