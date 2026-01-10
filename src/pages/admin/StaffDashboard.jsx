import { useState } from 'react';
import { useStaffAnalytics } from '../../hooks/useStaffAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Users, DollarSign, ShoppingBag, Award, Clock, 
  Utensils, Folder, Ticket, Shield, User, Star, Truck, Receipt 
} from 'lucide-react';

const StaffDashboard = () => {
  const { auditLog, visualData, performance, isLoading, visualPeriod, setVisualPeriod } = useStaffAnalytics();
  const [activeTab, setActiveTab] = useState('waiters');

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const safeVisualData = visualData || { cards: {}, charts: { waiters: { labels:[], series:[] }, payments: { labels:[], series:[] } } };
  const safePerformance = performance || { waiters: [], cashiers: [], admins: [] };
  
  const waiterChartData = safeVisualData.charts?.waiters?.labels?.map((label, index) => ({
      name: label,
      sales: safeVisualData.charts.waiters.series[index] || 0
  })) || [];

  const paymentChartData = safeVisualData.charts?.payments?.labels?.map((label, index) => ({
      name: label,
      value: safeVisualData.charts.payments.series[index] || 0
  })) || [];

  const getAuditIcon = (type) => {
      switch(type) {
          case 'product': return <Utensils size={14} className="text-orange-500"/>;
          case 'category': return <Folder size={14} className="text-blue-500"/>;
          case 'marketing': return <Ticket size={14} className="text-purple-500"/>;
          default: return <Clock size={14} className="text-gray-400"/>;
      }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse">Cargando datos...</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 pb-10">
      
      {/* IZQUIERDA: DASHBOARD PRINCIPAL */}
      <div className="flex-1 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Shield className="text-primary"/> Control de Personal
            </h1>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {['day', 'week', 'month'].map(p => (
                    <button key={p} onClick={() => setVisualPeriod(p)} className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition ${visualPeriod === p ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}</button>
                ))}
            </div>
        </div>

        {/* KPIs Generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Ventas Totales" value={`${safeVisualData.cards?.total_sales || 0} Bs`} icon={<DollarSign/>} color="text-orange-600" bg="bg-orange-50"/>
            <KpiCard title="Pedidos Totales" value={safeVisualData.cards?.total_orders || 0} icon={<ShoppingBag/>} color="text-blue-600" bg="bg-blue-50"/>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white">
                <p className="text-xs font-bold uppercase opacity-80 mb-1">Empleado Estrella</p>
                <div className="flex items-center gap-3">
                    <Award size={28} className="text-yellow-300"/>
                    <p className="text-lg font-black truncate">{safeVisualData.cards?.top_employee || '---'}</p>
                </div>
            </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-80 flex flex-col">
                <h3 className="font-bold text-gray-700 dark:text-white mb-4">🏆 Ranking Ventas (Meseros)</h3>
                <div className="flex-1 w-full min-h-0">
                    {waiterChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={waiterChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 11}} />
                                <Tooltip />
                                <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-400 mt-10">Sin datos de ventas</p>}
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-80 flex flex-col">
                <h3 className="font-bold text-gray-700 dark:text-white mb-4">💳 Pagos Recibidos</h3>
                <div className="flex-1 w-full min-h-0">
                    {paymentChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={paymentChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {paymentChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-400 mt-10">Sin datos de pagos</p>}
                </div>
            </div>
        </div>

        {/* === TABLA DE EMPLEADOS (ACTUALIZADA) === */}
        <div>
            <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-primary"/> Detalle del Equipo
                </h3>
                <div className="flex bg-white dark:bg-dark-card p-1 rounded-lg border dark:border-gray-700">
                    {['waiters', 'cashiers', 'admins'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)} 
                            className={`px-4 py-1 text-xs font-bold rounded-md capitalize transition ${activeTab === tab ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            {tab === 'waiters' ? 'Meseros' : tab === 'cashiers' ? 'Cajeros' : 'Admins'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(safePerformance[activeTab] || []).length === 0 ? (
                    <div className="col-span-full py-10 text-center bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-400">No se encontró personal en esta categoría.</p>
                    </div>
                ) : (
                    (safePerformance[activeTab] || []).map((staff, i) => (
                        <EmployeeCard key={i} staff={staff} type={activeTab} />
                    ))
                )}
            </div>
        </div>

      </div>

      {/* DERECHA: AUDITORÍA */}
      <div className="w-full xl:w-80 shrink-0">
          <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm h-full max-h-[800px] overflow-y-auto custom-scrollbar sticky top-4">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-primary"/> Actividad
              </h3>
              <div className="relative pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-6">
                  {(!auditLog || auditLog.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">No hay actividad registrada.</p>
                  ) : (
                      auditLog.map((log, i) => (
                          <div key={i} className="relative">
                              <div className="absolute -left-[25px] top-0 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-600 p-1 rounded-full">
                                  {getAuditIcon(log.type)}
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">
                                  {new Date(log.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </p>
                              <p className="text-sm font-bold text-gray-800 dark:text-white">{log.action}</p>
                              <p className="text-xs text-gray-500">{log.detail}</p>
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                                  <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                                      {log.user ? log.user.charAt(0) : '?'}
                                  </div>
                                  {log.user}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

// COMPONENTE TARJETA DE EMPLEADO (ACTUALIZADO CON NUEVAS MÉTRICAS)
const EmployeeCard = ({ staff, type }) => {
    let stats = [];

    if (type === 'waiters') {
        stats = [
            { label: 'Mesas Servidas', value: staff.tables_served || 0, icon: <Utensils size={14}/> },
            { label: 'Venta Total', value: staff.sales_generated || '0 Bs', icon: <DollarSign size={14}/>, highlight: true }
        ];
    } else if (type === 'cashiers') {
        stats = [
            { label: 'Facturas', value: staff.invoices || 0, icon: <Receipt size={14}/> },
            { label: 'Pedidos Llevar', value: staff.pickups_handled || 0, icon: <Truck size={14}/> },
            { label: 'Recaudado', value: staff.collected || '0 Bs', icon: <DollarSign size={14}/>, highlight: true }
        ];
    } else { // Admins
        stats = [
            { label: 'Pedidos Llevar', value: staff.pickups_created || 0, icon: <Truck size={14}/> },
            { label: 'Venta Pickup', value: staff.pickup_sales || '0 Bs', icon: <DollarSign size={14}/>, highlight: true }
        ];
    }

    return (
        <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-black text-gray-400 group-hover:text-primary group-hover:bg-indigo-50 transition-colors uppercase">
                    {staff.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{staff.full_name}</h4>
                    <span className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">
                        {type === 'waiters' ? 'Mesero' : type === 'cashiers' ? 'Cajero' : 'Admin'}
                    </span>
                </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-dashed border-gray-100 dark:border-gray-700">
                {stats.map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 flex items-center gap-1">
                            {stat.icon} {stat.label}
                        </span>
                        <span className={`font-bold ${stat.highlight ? 'text-primary text-sm' : 'text-gray-700 dark:text-gray-300'}`}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const KpiCard = ({ title, value, icon, color, bg }) => (
    <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div><p className="text-gray-500 text-xs font-bold uppercase mb-1">{title}</p><h2 className="text-xl font-black text-gray-800 dark:text-white">{value}</h2></div>
        <div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
    </div>
);

export default StaffDashboard;