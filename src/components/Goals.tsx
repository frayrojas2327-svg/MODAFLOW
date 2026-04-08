import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Target, 
  TrendingUp, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  X,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { AppState, Goal } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format, differenceInDays, isAfter, isBefore, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface GoalsProps {
  data: AppState;
  onUpdate: () => void;
}

export default function Goals({ data, onUpdate }: GoalsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    type: 'sales',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetAmount: 0,
  });

  // Calculate current amount for each goal
  const goalsWithProgress = useMemo(() => {
    return data.goals.map(goal => {
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
      } else if (goal.type === 'savings') {
        const incomes = data.incomes
          .filter(i => isWithinInterval(new Date(i.date), { start, end }))
          .reduce((acc, i) => acc + i.amount, 0);
        
        const totalSales = data.sales
          .filter(s => isWithinInterval(new Date(s.date), { start, end }))
          .reduce((acc, s) => acc + s.total, 0);
          
        const totalExpenses = data.expenses
          .filter(e => isWithinInterval(new Date(e.date), { start, end }))
          .reduce((acc, e) => acc + e.amount, 0);
          
        current = (totalSales + incomes) - totalExpenses;
      }
      
      return { ...goal, currentAmount: current };
    });
  }, [data.goals, data.sales, data.expenses, data.incomes]);

  const activeGoals = useMemo(() => {
    return goalsWithProgress.filter(g => isBefore(new Date(), endOfDay(new Date(g.endDate))));
  }, [goalsWithProgress]);

  const completedGoals = useMemo(() => {
    return goalsWithProgress.filter(g => isAfter(new Date(), endOfDay(new Date(g.endDate))));
  }, [goalsWithProgress]);

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.targetAmount || newGoal.targetAmount <= 0) {
      toast.error('Por favor completa todos los campos correctamente.');
      return;
    }

    const goal: Goal = {
      id: generateId(),
      title: newGoal.title!,
      targetAmount: Number(newGoal.targetAmount),
      currentAmount: 0,
      startDate: newGoal.startDate!,
      endDate: newGoal.endDate!,
      type: newGoal.type as 'sales' | 'profit' | 'savings',
      ownerUid: auth.currentUser?.uid || ''
    };

    try {
      await firebaseService.addGoal(goal);
      toast.success('Meta creada con éxito');
      setIsModalOpen(false);
      setNewGoal({
        type: 'sales',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetAmount: 0,
      });
      onUpdate();
    } catch (error) {
      toast.error('Error al crear la meta');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await firebaseService.deleteGoal(id);
      toast.success('Meta eliminada');
      onUpdate();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getRemainingDays = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return Math.max(days, 0);
  };

  const getDailyPace = (goal: Goal) => {
    const daysLeft = getRemainingDays(goal.endDate);
    const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);
    if (daysLeft <= 0) return remainingAmount;
    return remainingAmount / daysLeft;
  };

  const chartData = useMemo(() => {
    return activeGoals.map(g => ({
      name: g.title,
      progreso: calculateProgress(g.currentAmount, g.targetAmount),
      restante: 100 - calculateProgress(g.currentAmount, g.targetAmount)
    }));
  }, [activeGoals]);

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">Metas</h1>
          <p className="text-white/40 text-sm font-medium">Objetivos y proyecciones de crecimiento</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-2xl transition-all font-black shadow-[0_0_20px_rgba(249,115,22,0.3)] text-xs uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Nueva Meta
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-black border border-white/5 p-4 md:p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <Target className="w-12 h-12" />
          </div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Activas</p>
          <p className="text-2xl md:text-4xl font-black">{activeGoals.length}</p>
        </div>

        <div className="bg-black border border-white/5 p-4 md:p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Logradas</p>
          <p className="text-2xl md:text-4xl font-black">{completedGoals.length}</p>
        </div>

        <div className="bg-black border border-white/5 p-4 md:p-6 rounded-3xl relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-12 h-12" />
          </div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Progreso</p>
          <p className="text-2xl md:text-4xl font-black">
            {activeGoals.length > 0 
              ? Math.round(activeGoals.reduce((acc, g) => acc + calculateProgress(g.currentAmount, g.targetAmount), 0) / activeGoals.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Visual Analysis */}
      {activeGoals.length > 0 && (
        <div className="bg-black border border-white/5 rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Análisis de Progreso
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="progreso" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progreso >= 100 ? '#22c55e' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-500" />
          Metas Activas
        </h2>
        
        {activeGoals.length === 0 ? (
          <div className="bg-black border border-white/5 rounded-3xl p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Target className="w-10 h-10 text-white/10" />
            </div>
            <div>
              <p className="text-xl font-bold text-white/40">No hay metas activas</p>
              <p className="text-white/20 text-sm mt-1">Define tu primer objetivo para empezar a medir tu éxito.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeGoals.map(goal => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const daysLeft = getRemainingDays(goal.endDate);
              const dailyPace = getDailyPace(goal);
              const isCompleted = progress >= 100;
              
              return (
                <motion.div 
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 group hover:border-orange-500/30 transition-all relative overflow-hidden"
                >
                  {isCompleted && (
                    <motion.div 
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute top-0 right-0 p-4 z-10"
                    >
                      <div className="bg-green-500 text-black p-2 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          goal.type === 'sales' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                          goal.type === 'profit' ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                          "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        )}>
                          {goal.type === 'sales' ? 'Ventas' : goal.type === 'profit' ? 'Ganancia' : 'Ahorro'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight">{goal.title}</h3>
                      <p className="text-white/40 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Finaliza el {format(new Date(goal.endDate), 'dd MMMM, yyyy', { locale: es })}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 hover:bg-red-500/10 text-white/10 hover:text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">Actual</p>
                        <p className="text-2xl font-black">{formatCurrency(goal.currentAmount)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">Objetivo</p>
                        <p className="text-xl font-bold text-white/60">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                    </div>
                    
                    <div className="relative h-5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 relative",
                          isCompleted ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                        )}
                      >
                        {progress > 10 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                          />
                        )}
                      </motion.div>
                    </div>
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className={isCompleted ? "text-green-500" : "text-orange-500"}>{progress}% Completado</span>
                      <span className="text-white/20">Faltan {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Ritmo Diario</p>
                        <p className="font-bold text-sm">
                          {isCompleted ? '¡Meta lograda!' : `${formatCurrency(dailyPace)} / día`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white/20" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Tiempo Restante</p>
                        <p className="font-bold text-sm">
                          {daysLeft > 0 ? `${daysLeft} días` : '¡Último día!'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isCompleted && (
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        progress > 50 ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                      )}>
                        {progress > 50 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <p className="text-xs font-medium text-white/60 leading-relaxed">
                        {progress > 80 
                          ? "¡Casi lo logras! Mantén el ritmo para cerrar con éxito." 
                          : progress > 50 
                          ? "Vas por buen camino. Sigue así para alcanzar tu objetivo."
                          : `Necesitas vender ${formatCurrency(dailyPace)} diarios para llegar a la meta.`}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-black border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Nueva Meta</h2>
                  <p className="text-white/40 text-sm mt-1">Define un objetivo claro para tu negocio.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-3 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Título de la Meta</label>
                  <input 
                    type="text"
                    placeholder="Ej: Campaña de Invierno 2026"
                    value={newGoal.title || ''}
                    onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500/50 text-lg font-medium placeholder:text-white/10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Monto Objetivo</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={newGoal.targetAmount || ''}
                        onChange={e => setNewGoal({...newGoal, targetAmount: Number(e.target.value)})}
                        className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-orange-500/50 text-lg font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Tipo de Meta</label>
                    <select 
                      value={newGoal.type}
                      onChange={e => setNewGoal({...newGoal, type: e.target.value as any})}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500/50 text-lg font-medium appearance-none"
                    >
                      <option value="sales" className="bg-black text-white">Ventas Totales</option>
                      <option value="profit" className="bg-black text-white">Ganancia Neta</option>
                      <option value="savings" className="bg-black text-white">Ahorro (Ingresos - Gastos)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Fecha Inicio</label>
                    <input 
                      type="date"
                      value={newGoal.startDate}
                      onChange={e => setNewGoal({...newGoal, startDate: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500/50 font-medium"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Fecha Fin</label>
                    <input 
                      type="date"
                      value={newGoal.endDate}
                      onChange={e => setNewGoal({...newGoal, endDate: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500/50 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleAddGoal}
                  className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-black font-black text-lg rounded-2xl transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98]"
                >
                  Establecer Meta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
