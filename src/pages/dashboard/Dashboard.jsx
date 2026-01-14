import { useMemo,useEffect } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { START_YEAR } from '../../config';
import { useTranslation } from 'react-i18next'; // <-- IMPORTAMOS
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, TrendingUp, ShoppingBag, Calendar, Clock, 
  Award, PieChart as PieIcon, Utensils, Truck, ArrowUpRight,Loader2 ,ArrowDownRight 
} from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const { 
    kpis, channelsData, yearComparison, topProfitable, weeklyPattern, topProducts, peakHours, isLoading,
    kpiPeriod, setKpiPeriod, 
    channelPeriod, setChannelPeriod,
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear
  } = useAnalytics();

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // --- LÓGICA AÑOS DINÁMICOS ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const startYear = START_YEAR;
  const yearsList = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

  // --- CÁLCULOS DE CRECIMIENTO ANUAL (Para que no se vea vacío) ---
  const annualSummary = useMemo(() => {
      if (!yearComparison?.data) return { totalCurrent: 0, growth: 0 };
      
      const totalCurrent = yearComparison.data.reduce((acc, curr) => acc + (parseFloat(curr.year_current) || 0), 0);
      const totalPast = yearComparison.data.reduce((acc, curr) => acc + (parseFloat(curr.year_past) || 0), 0);
      
      let growth = 0;
      if (totalPast > 0) growth = ((totalCurrent - totalPast) / totalPast) * 100;
      else if (totalCurrent > 0) growth = 100;

      return { totalCurrent, growth };
  }, [yearComparison]);

  // --- Mapeo de nombres de mes a número ---
  const monthNameToNumber = useMemo(() => ({
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
  }), []);

  // --- Lógica para filtrar meses disponibles ---
  const availableMonths = useMemo(() => {
    // Si no hay datos de comparación, no podemos determinar los meses.
    if (!yearComparison?.data) {
        // Para el año actual, podemos mostrar de forma segura los meses hasta el actual.
        if (selectedYear === currentYear) {
            return Array.from({ length: currentMonth }, (_, i) => i + 1);
        }
        // Para años pasados, sin datos, no podemos mostrar nada.
        return [];
    }

    // Crea un conjunto de meses que tienen datos de ventas reales (mayores que 0).
    const monthsWithData = new Set(
      yearComparison.data
        .filter(item => parseFloat(item.year_current) > 0)
        .map(item => monthNameToNumber[item.month])
    );

    let monthsToShow = [];

    // Si el año seleccionado es un año pasado
    if (selectedYear < currentYear) {
        monthsToShow = Array.from(monthsWithData);
    } 
    // Si el año seleccionado es el año actual
    else if (selectedYear === currentYear) {
        // Muestra todos los meses desde el inicio del año hasta el mes actual.
        monthsToShow = Array.from({ length: currentMonth }, (_, i) => i + 1);
    }
    
    // Ordena los meses cronológicamente.
    return monthsToShow.sort((a, b) => a - b);
  }, [yearComparison.data, selectedYear, currentYear, currentMonth, monthNameToNumber]);

  // --- Efecto para auto-seleccionar un mes válido ---
  useEffect(() => {
    // Si no hay meses disponibles para el año seleccionado, no selecciones ninguno.
    if (availableMonths.length === 0) {
      if (selectedMonth !== null) setSelectedMonth(null);
      return;
    }

    // Comprueba si el mes actualmente seleccionado es válido.
    const isSelectedMonthValid = availableMonths.includes(selectedMonth);

    // Si el mes seleccionado no es válido (o no hay ninguno),
    // selecciona el mes más reciente de la lista de disponibles.
    if (!isSelectedMonthValid) {
      const latestMonth = availableMonths[availableMonths.length - 1];
      setSelectedMonth(latestMonth);
    }
  }, [availableMonths, selectedMonth, setSelectedMonth]);


  // --- TOOLTIP PERSONALIZADO (Más bonito) ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const current = payload.find(p => p.name.includes(yearComparison.current_year))?.value || 0;
      const past = payload.find(p => p.name.includes(yearComparison.compared_to))?.value || 0;
      // Buscamos el porcentaje que viene del backend
      const dataItem = payload[0].payload; 
      const percent = dataItem.growth_percentage || '0%';

      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 text-xs">
          <p className="font-bold mb-2 text-gray-500 uppercase">{label}</p>
          <div className="space-y-1">
              <p className="font-bold text-primary flex justify-between gap-4">
                  <span>{yearComparison.current_year}:</span> 
                  <span>{current.toLocaleString()} {t('common.currency')}</span>
              </p>
              <p className="font-bold text-gray-400 flex justify-between gap-4">
                  <span>{yearComparison.compared_to}:</span> 
                  <span>{past.toLocaleString()} {t('common.currency')}</span>
              </p>
              <div className={`mt-2 pt-2 border-t flex items-center gap-1 font-bold ${percent.includes('-') ? 'text-red-500' : 'text-green-500'}`}>
                  {percent.includes('-') ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>}
                  {t('vs_previous_year', { percent })}
              </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">{t('dashboard_summary_title')}</h1>
          <p className="text-gray-500 text-sm">{t('dashboard_summary_subtitle')}</p>
        </div>
        
        <div className="flex gap-2">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="p-2 bg-gray-50 border rounded-lg font-bold text-sm dark:bg-gray-800 dark:text-white"
                        >
                           {availableMonths.map((monthNum) => (
                               <option key={monthNum} value={monthNum}>
                                   {t('month_number', { number: monthNum })}
                               </option>
                           ))}
                        </select>            
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 bg-gray-50 border rounded-lg font-bold text-sm dark:bg-gray-800 dark:text-white"
            >
               {yearsList.map(year => (
                   <option key={year} value={year}>{year}</option>
               ))}
            </select>
        </div>
      </div>

      {/* 1. TARJETAS DE DINERO (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="col-span-full flex justify-end mb-[-10px]">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex text-xs font-bold">
               <button onClick={() => { setKpiPeriod('day'); setSelectedYear(currentYear); setSelectedMonth(currentMonth); }} className={`px-3 py-1 rounded transition ${kpiPeriod === 'day' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('today')}</button>
               <button onClick={() => { setKpiPeriod('month'); setSelectedYear(currentYear); setSelectedMonth(currentMonth); }} className={`px-3 py-1 rounded transition ${kpiPeriod === 'month' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('this_month')}</button>
            </div>
         </div>

         <KpiCard title={t('total_sales')} value={kpis.total_revenue} icon={<DollarSign/>} color="text-blue-600" bg="bg-blue-50"/>
         <KpiCard title={t('net_profit')} value={kpis.net_profit} icon={<TrendingUp/>} color="text-green-600" bg="bg-green-50"/>
         <KpiCard title={t('average_ticket')} value={kpis.average_ticket} icon={<ShoppingBag/>} color="text-purple-600" bg="bg-purple-50"/>
         <KpiCard title={t('profit_margin')} value={kpis.profit_margin} icon={<Award/>} color="text-orange-600" bg="bg-orange-50" isPercent/>
      </div>

      {/* 2. NUEVO: VS CANALES DE VENTA */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800 dark:text-white">
                  <Utensils size={20} className="text-primary"/> {t('what_sells_more_title')}
              </h3>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  {['day', 'week', 'month', 'year'].map((p) => (
                      <button 
                        key={p} 
                        onClick={() => {
                          setChannelPeriod(p);
                          if (p === 'month' || p === 'week' || p === 'day') {
                            setSelectedYear(currentYear);
                            setSelectedMonth(currentMonth);
                          }
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition ${channelPeriod === p ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                      >
                          {p === 'day' ? t('today') : p === 'week' ? t('week') : p === 'month' ? t('month') : t('year')}
                      </button>
                  ))}
              </div>
          </div>

          {channelsData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${channelsData.winner === 'Mesas' ? 'border-green-400 bg-green-50/50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-white rounded-full shadow-sm text-orange-500"><Utensils size={24}/></div>
                          <div>
                              <p className="text-xs font-bold text-gray-500 uppercase">{t('tables_dine_in')}</p>
                              <p className="text-2xl font-black text-gray-800">{channelsData.dine_in?.total || 0} {t('common.currency')}</p>
                              <p className="text-xs text-gray-400">{channelsData.dine_in?.count || 0} {t('orders_count')}</p>
                          </div>
                      </div>
                      {channelsData.winner === 'Mesas' && <Award size={32} className="text-green-500"/>}
                  </div>

                  <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${channelsData.winner === 'Pickup' || channelsData.winner === 'Pedidos' ? 'border-green-400 bg-green-50/50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-white rounded-full shadow-sm text-blue-500"><Truck size={24}/></div>
                          <div>
                              <p className="text-xs font-bold text-gray-500 uppercase">{t('takeaway')}</p>
                              <p className="text-2xl font-black text-gray-800">{channelsData.pickup?.total || 0} {t('common.currency')}</p>
                              <p className="text-xs text-gray-400">{channelsData.pickup?.count || 0} {t('orders_count')}</p>
                          </div>
                      </div>
                      {(channelsData.winner === 'Pickup' || channelsData.winner === 'Pedidos') && <Award size={32} className="text-green-500"/>}
                  </div>
              </div>
          ) : <div className="text-center py-8 text-gray-400">{t('loading_comparison')}</div>}
      </div>

      {/* 3. COMPARATIVA ANUAL (Ahora se ve llena y profesional) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[380px] flex flex-col">
           {/* Header de la Gráfica */}
           <div className="flex justify-between items-start mb-2">
               <div>
                   <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><Calendar size={18}/> {t('annual_performance_title')}</h3>
                   <p className="text-xs text-gray-500">{t('comparing_years', { current_year: yearComparison.current_year, compared_to: yearComparison.compared_to })}</p>
               </div>
               <div className="text-right">
                   <p className="text-xs text-gray-400 font-bold uppercase">{t('total_year', { year: yearComparison.current_year })}</p>
                   <p className="text-2xl font-black text-primary">{annualSummary.totalCurrent.toLocaleString()} {t('common.currency')}</p>
                   <p className={`text-xs font-bold ${annualSummary.growth >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center justify-end gap-1`}>
                       {annualSummary.growth >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                       {annualSummary.growth.toFixed(1)}% {t('global_growth')}
                   </p>
               </div>
           </div>

           {/* Gráfica con Barras más gorditas */}
           <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={yearComparison.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 12, fill: '#94a3b8'}}/>
                      <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}}/>
                      {/* BARRAS ANCHAS Y REDONDEADAS */}
                      <Bar 
                        dataKey="year_past" 
                        name={`${t('common.yearLabel')} ${yearComparison.compared_to}`} 
                        fill="#e2e8f0" 
                        radius={[4,4,4,4]} 
                        barSize={12} 
                      />
                      <Bar 
                        dataKey="year_current" 
                        name={`${t('common.yearLabel')} ${yearComparison.current_year}`} 
                        fill="#6366f1" 
                        radius={[4,4,4,4]} 
                        barSize={12} // Más anchas para que se vean bien
                      />
                   </BarChart>
               </ResponsiveContainer>
           </div>
        </div>

        {/* TOP RENTABILIDAD */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[380px] overflow-hidden flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-green-700 dark:text-green-400">💰 {t('top_profits_title')}</h3>
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {topProfitable.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 transition">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-400 text-sm">#{idx + 1}</span>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white text-sm">{item.name}</p>
                                <p className="text-[10px] text-gray-500">{item.sold} {t('sold_items')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-green-600 dark:text-green-400 text-sm">+{item.profit} {t('common.currency')}</p>
                            <div className="w-16 bg-gray-200 h-1.5 rounded-full mt-1 ml-auto">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (item.profit / topProfitable[0].profit) * 100)}%`}}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* 4. GRÁFICOS INFERIORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[350px]">
             <h3 className="font-bold text-lg mb-4 flex gap-2 items-center dark:text-white">
                <PieIcon size={20} className="text-purple-500"/> {t('top_selling_title')}
             </h3>
             <ResponsiveContainer width="100%" height="90%">
                 <PieChart>
                     <Pie
                         data={topProducts}
                         cx="50%" cy="50%"
                         innerRadius={60} outerRadius={80}
                         paddingAngle={5}
                         dataKey="total_sold"
                         nameKey="name"
                         label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                     >
                         {topProducts.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                     </Pie>
                     <Tooltip />
                 </PieChart>
             </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[350px]">
             <h3 className="font-bold text-lg mb-4 flex gap-2 items-center dark:text-white"><Clock size={18}/> {t('peak_hours_title')}</h3>
             <ResponsiveContainer width="100%" height="90%">
                 <AreaChart data={peakHours}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" tick={{fontSize: 12}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="orders_count" stroke="#ec4899" fillOpacity={1} fill="url(#colorOrders)" name={t('orders_chart_label')} />
                 </AreaChart>
             </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
};

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

export default Dashboard;