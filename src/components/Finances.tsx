import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  TooltipProps
} from 'recharts';
import { AppState, Sale } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth, isWithinInterval, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter, ArrowUpRight, ArrowDownRight, PieChart as PieIcon, List, TrendingUp, Palette, Ruler, Shirt } from 'lucide-react';
import { motion } from 'motion/react';

interface FinancesProps {
  data: AppState;
}

export default function Finances({ data }: FinancesProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '12m' | 'custom'>('30d');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());

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

  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalCogs = filteredSales.reduce((acc, s) => acc + ((s.cost || 0) * s.quantity), 0);
  const totalOtherIncomes = filteredIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalRevenue = totalSalesRevenue + totalOtherIncomes;
  
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const grossProfit = totalSalesRevenue - totalCogs;
  const totalProfit = totalRevenue - totalExpenses - totalCogs;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Daily breakdown for the selected range (for the chart - all days)
  const daysCount = Math.ceil((endOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const chartData = Array.from({ length: daysCount }).map((_, i) => {
    const date = startOfDay(subDays(endDate, daysCount - 1 - i));
    const daySales = filteredSales.filter(s => isSameDay(new Date(s.date), date));
    const dayOtherIncomes = filteredIncomes.filter(inc => isSameDay(new Date(inc.date), date));
    const dayExpenses = filteredExpenses.filter(e => isSameDay(new Date(e.date), date));
    
    const revenue = daySales.reduce((acc, s) => acc + s.total, 0) + dayOtherIncomes.reduce((acc, inc) => acc + inc.amount, 0);
    const expenses = dayExpenses.reduce((acc, e) => acc + e.amount, 0);
    
    return {
      name: format(date, 'dd/MM'),
      fullDate: date,
      revenue,
      expenses,
      profit: revenue - expenses
    };
  });

  // Daily breakdown for the table (only days with activity)
  const tableData = [...chartData]
    .filter(d => d.revenue > 0 || d.expenses > 0)
    .reverse();

  // Income by category
  const incomeByCategory = filteredSales.reduce((acc, s) => {
    const product = data.products.find(p => p.id === s.productId);
    const category = product?.category || 'Ventas (Sin cat.)';
    acc[category] = (acc[category] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  filteredIncomes.forEach(inc => {
    incomeByCategory[inc.category] = (incomeByCategory[inc.category] || 0) + inc.amount;
  });

  const incomePieData = Object.entries(incomeByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Expense by category
  const expenseByCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const expensePieData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Advanced Analysis: Top Designs, Colors, Sizes
  const salesByDesign = filteredSales.reduce((acc, s) => {
    const product = data.products.find(p => p.id === s.productId);
    const design = product?.design || s.productName;
    acc[design] = (acc[design] || 0) + s.quantity;
    return acc;
  }, {} as Record<string, number>);

  const salesByColor = filteredSales.reduce((acc, s) => {
    acc[s.color] = (acc[s.color] || 0) + s.quantity;
    return acc;
  }, {} as Record<string, number>);

  const salesBySize = filteredSales.reduce((acc, s) => {
    acc[s.size] = (acc[s.size] || 0) + s.quantity;
    return acc;
  }, {} as Record<string, number>);

  const topDesigns = Object.entries(salesByDesign)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topColors = Object.entries(salesByColor)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topSizes = Object.entries(salesBySize)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  
  const COLORS = ['#F97316', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#6366F1', '#F59E0B'];

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

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Finanzas Pro</h1>
          <p className="text-white/50 mt-1 text-[16px]">Análisis profundo de rentabilidad y flujo de caja.</p>
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
            <CalendarIcon className="w-6 h-6 text-orange-500" />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl group hover:border-green-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[15px] md:text-[16px] font-medium">Ingresos</p>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </div>
          <h4 className="text-xl md:text-2xl font-bold text-green-500">{formatCurrency(totalRevenue)}</h4>
          <p className="text-[15px] text-white/20 mt-1">Total acumulado</p>
        </div>
        <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl group hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[15px] md:text-[16px] font-medium">Costo de Ventas</p>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </div>
          <h4 className="text-xl md:text-2xl font-bold text-red-500">{formatCurrency(totalCogs)}</h4>
          <p className="text-[15px] text-white/20 mt-1">Costo de mercadería</p>
        </div>
        <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl group hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[15px] md:text-[16px] font-medium">Ganancia Bruta</p>
            <div className={cn("w-2 h-2 rounded-full", grossProfit >= 0 ? "bg-green-500" : "bg-red-500")} />
          </div>
          <h4 className="text-xl md:text-2xl font-bold text-orange-500">{formatCurrency(grossProfit)}</h4>
          <p className="text-[15px] text-white/20 mt-1">Ventas - Costo</p>
        </div>
        <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[15px] md:text-[16px] font-medium">Ganancia Neta</p>
            <span className="text-[15px] font-bold text-blue-500">ROI</span>
          </div>
          <h4 className="text-xl md:text-2xl font-bold">{formatCurrency(totalProfit)}</h4>
          <p className="text-[15px] text-white/20 mt-1">Balance final</p>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
            <BarChart className="w-5 h-5 text-orange-500" />
            Tendencia de Balance
          </h3>
          <div className="flex items-center gap-4 text-[15px] md:text-[15px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-white/60">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-white/60">Gastos</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
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
                dataKey="revenue" 
                stroke="#10B981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                name="Ingresos"
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="#EF4444" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
                name="Gastos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Daily Breakdown Table */}
        <div className="lg:col-span-2 bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <List className="w-5 h-5 text-orange-500" />
              Desglose Diario
            </h3>
            <span className="text-[15px] md:text-[15px] text-white/40">{tableData.length} días con actividad</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[15px] uppercase tracking-wider text-white/40 border-b border-white/5">
                  <th className="pb-4 font-medium">Fecha</th>
                  <th className="pb-4 font-medium">Ingresos</th>
                  <th className="pb-4 font-medium">Gastos</th>
                  <th className="pb-4 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableData.map((day) => (
                  <tr key={day.fullDate.toISOString()} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4 text-[15px] font-medium">
                      {format(day.fullDate, 'dd MMM', { locale: es })}
                      <span className="text-[15px] text-white/20 ml-2 uppercase">{format(day.fullDate, 'EEE', { locale: es })}</span>
                    </td>
                    <td className="py-4 text-[15px] text-green-500 font-bold">{formatCurrency(day.revenue)}</td>
                    <td className="py-4 text-[15px] text-red-400">{formatCurrency(day.expenses)}</td>
                    <td className="py-4 text-[15px] text-right font-bold">
                      <span className={cn(
                        "px-2 py-1 rounded-lg",
                        day.profit >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {formatCurrency(day.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
                {tableData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-white/20 text-[16px] italic">
                      No hay transacciones en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Analysis */}
        <div className="space-y-6 md:space-y-8">
          {/* Income by Category */}
          <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-[16px] md:text-base font-semibold mb-6 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-green-500" />
              Ingresos por Categoría
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {incomePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {incomePieData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-[15px]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-white/60 truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="bg-black p-5 md:p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-[16px] md:text-base font-semibold mb-6 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-red-500" />
              Gastos por Categoría
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {expensePieData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-[15px]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-white/60 truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analysis Section */}
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Análisis de Preferencias</h2>
            <p className="text-white/40 text-[15px] md:text-[16px]">Lo que más buscan tus clientes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Designs */}
          <div className="bg-black p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shirt className="w-24 h-24" />
            </div>
            <h3 className="text-[16px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-orange-500" />
              Top Diseños
            </h3>
            <div className="space-y-4">
              {topDesigns.map((item, index) => (
                <div key={item.name} className="relative">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[15px] font-bold text-white/80">{item.name}</span>
                    <span className="text-[15px] font-black text-orange-500">{item.value} vendidos</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / topDesigns[0].value) * 100}%` }}
                      className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    />
                  </div>
                </div>
              ))}
              {topDesigns.length === 0 && <p className="text-[15px] text-white/20 italic">Sin datos de venta</p>}
            </div>
          </div>

          {/* Top Colors */}
          <div className="bg-black p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Palette className="w-24 h-24" />
            </div>
            <h3 className="text-[16px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-500" />
              Top Colores
            </h3>
            <div className="space-y-4">
              {topColors.map((item, index) => (
                <div key={item.name} className="relative">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[15px] font-bold text-white/80">{item.name}</span>
                    <span className="text-[15px] font-black text-blue-500">{item.value} vendidos</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / topColors[0].value) * 100}%` }}
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                </div>
              ))}
              {topColors.length === 0 && <p className="text-[15px] text-white/20 italic">Sin datos de venta</p>}
            </div>
          </div>

          {/* Top Sizes */}
          <div className="bg-black p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Ruler className="w-24 h-24" />
            </div>
            <h3 className="text-[16px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-green-500" />
              Top Tallas
            </h3>
            <div className="space-y-4">
              {topSizes.map((item, index) => (
                <div key={item.name} className="relative">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[15px] font-bold text-white/80">{item.name}</span>
                    <span className="text-[15px] font-black text-green-500">{item.value} vendidos</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / topSizes[0].value) * 100}%` }}
                      className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    />
                  </div>
                </div>
              ))}
              {topSizes.length === 0 && <p className="text-[15px] text-white/20 italic">Sin datos de venta</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
