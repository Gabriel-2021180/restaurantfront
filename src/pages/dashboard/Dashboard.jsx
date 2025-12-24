import { useAnalytics } from '../../hooks/useAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { DollarSign, TrendingUp, Users, ShoppingBag, Calendar, Clock, Award } from 'lucide-react';

const AnalyticsDashboard = () => {
  const { 
    kpis, yearComparison, topProfitable, weeklyPattern, topProducts, peakHours, staffPerformance, isLoading,
    kpiPeriod, setKpiPeriod, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear
  } = useAnalytics();

  // Colores para gráficos
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) return <div className="p-10 text-center animate-pulse">Cargando inteligencia de negocios...</div>;

  return (
    <div className="space-y-6 pb-10">
      
      {/* --- HEADER Y FILTROS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Business Intelligence</h1>
          <p className="text-gray-500 text-sm">Visión estratégica de tu restaurante</p>
        </div>
        
        {/* Filtros Globales */}
        <div className="flex gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 bg-gray-50 border rounded-lg font-bold text-sm"
            >
               {[...Array(12)].map((_, i) => <option key={i} value={i+1}>Mes {i+1}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 bg-gray-50 border rounded-lg font-bold text-sm"
            >
               <option value="2024">2024</option>
               <option value="2025">2025</option>
            </select>
        </div>
      </div>

      {/* --- 1. SECCIÓN DE KPIS (BIG NUMBERS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Toggle Periodo KPI */}
         <div className="col-span-full flex justify-end mb-[-10px]">
            <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold">
               <button onClick={() => setKpiPeriod('day')} className={`px-3 py-1 rounded ${kpiPeriod === 'day' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Hoy</button>
               <button onClick={() => setKpiPeriod('month')} className={`px-3 py-1 rounded ${kpiPeriod === 'month' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Este Mes</button>
            </div>
         </div>

         <KpiCard title="Ingresos Totales" value={kpis.total_revenue} icon={<DollarSign/>} color="text-blue-600" bg="bg-blue-50"/>
         <KpiCard title="Ganancia Neta" value={kpis.net_profit} icon={<TrendingUp/>} color="text-green-600" bg="bg-green-50"/>
         <KpiCard title="Ticket Promedio" value={kpis.average_ticket} icon={<ShoppingBag/>} color="text-purple-600" bg="bg-purple-50"/>
         <KpiCard title="Margen Rentabilidad" value={kpis.profit_margin} icon={<Award/>} color="text-orange-600" bg="bg-orange-50" isPercent/>
      </div>

      {/* --- 2. COMPARATIVA ANUAL (Eje Central) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
           <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={18}/> Comparativa Anual ({yearComparison.current_year} vs {yearComparison.compared_to})</h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={yearComparison.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`}/>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    <Legend />
                    <Bar dataKey="year_past" name={`Año ${yearComparison.compared_to}`} fill="#cbd5e1" radius={[4,4,0,0]} />
                    <Bar dataKey="year_current" name={`Año ${yearComparison.current_year}`} fill="#6366f1" radius={[4,4,0,0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* TOP PROFIT (Más importante que volumen) */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-green-700">🏆 Top Rentabilidad</h3>
            <div className="space-y-4 overflow-y-auto h-[300px] pr-2 custom-scrollbar">
                {topProfitable.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-green-50 transition">
                        <div>
                            <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.sold} vendidos</p>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-green-600">+${item.profit}</p>
                            <p className="text-[10px] text-gray-400">Margen neto</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- 3. ANÁLISIS OPERATIVO (Semana y Horas) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patrón Semanal */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
             <h3 className="font-bold text-lg mb-4">🔥 Calor Semanal</h3>
             <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={weeklyPattern}>
                      <XAxis dataKey="day" tick={{fontSize: 12}} interval={0}/>
                      <Tooltip />
                      <Bar dataKey="traffic" name="Tráfico Promedio" fill="#f59e0b" radius={[4,4,0,0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Horas Pico */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
             <h3 className="font-bold text-lg mb-4 flex gap-2 items-center"><Clock size={18}/> Horas Pico (Mes {selectedMonth})</h3>
             <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={peakHours}>
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" />
                      <Tooltip />
                      <Area type="monotone" dataKey="orders_count" stroke="#ec4899" fillOpacity={1} fill="url(#colorOrders)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* --- 4. STAFF Y PRODUCTOS (Volumen) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Performance */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
             <h3 className="font-bold text-lg mb-4 flex gap-2 items-center"><Users size={18}/> Rendimiento del Equipo</h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead>
                         <tr className="text-gray-400 text-xs uppercase border-b">
                             <th className="pb-2">Mesero</th>
                             <th className="pb-2 text-center">Mesas Cerradas</th>
                             <th className="pb-2 text-right">Venta Total</th>
                             <th className="pb-2 text-right">Eficacia</th>
                         </tr>
                     </thead>
                     <tbody className="text-sm">
                         {staffPerformance.map((staff, idx) => (
                             <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                 <td className="py-3 font-bold text-gray-700 capitalize">{staff.waiter}</td>
                                 <td className="py-3 text-center">
                                     <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-bold">{staff.tables_closed}</span>
                                 </td>
                                 <td className="py-3 text-right font-mono">${staff.total_sales}</td>
                                 <td className="py-3 text-right">
                                    {/* Lógica visual simple: Venta / Mesas */}
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${(staff.tables_closed / 100) * 100}%`}}></div>
                                    </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>

          {/* Top Products (Volumen - Pie Chart) */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
             <h3 className="font-bold text-lg mb-4">Top Volumen</h3>
             <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={topProducts}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="total_sold"
                        >
                            {topProducts.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" layout="vertical" verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

    </div>
  );
};

// Componente pequeño para Tarjetas KPI
const KpiCard = ({ title, value, icon, color, bg, isPercent = false }) => (
    <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">
                {!isPercent && '$'}{value}
            </h2>
        </div>
        <div className={`p-3 rounded-xl ${bg} ${color}`}>
            {icon}
        </div>
    </div>
);

export default AnalyticsDashboard;