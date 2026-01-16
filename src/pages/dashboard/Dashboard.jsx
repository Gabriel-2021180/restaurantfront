import { useMemo, useEffect } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { START_YEAR } from '../../config';
import { useTranslation } from 'react-i18next';
import ModernSelect from '../../components/ui/ModernSelect'; // <--- IMPORTAR EL NUEVO SELECT
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, TrendingUp, ShoppingBag, Calendar, Clock, 
  Award, PieChart as PieIcon, Utensils, Truck, ArrowUpRight, Loader2, ArrowDownRight
} from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const { 
    kpis, channelsData, yearComparison, topProfitable, weeklyPattern, topProducts, peakHours, isLoading,
    kpiPeriod, setKpiPeriod, 
    channelPeriod, setChannelPeriod,
    selectedMonth, setSelectedMonth, 
    selectedYear, setSelectedYear
  } = useAnalytics();

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const startYear = START_YEAR;
  
  // 1. Opciones de Año
  const yearOptions = Array.from({ length: currentYear - startYear + 1 }, (_, i) => {
      const year = currentYear - i;
      return { value: year, label: `${year}` };
  });
  
  const monthsList = t('monthsList', { returnObjects: true });

  // 2. LÓGICA DE MESES VÁLIDOS (Estricta)
  const monthOptions = useMemo(() => {
      if (!yearComparison?.data) return [];

      return monthsList.map((name, index) => {
          const monthNum = index + 1;
          const monthData = yearComparison.data.find(d => d.month === name.substring(0,3) || parseInt(d.month) === monthNum); // Back devuelve nombre corto o numero
          
          // Buscamos si tiene ventas > 0 en el array de comparación
          // OJO: yearComparison devuelve 12 items. Buscamos por índice si el backend devuelve array ordenado de 1 a 12.
          const dataAtIndex = yearComparison.data[index]; 
          const hasSales = dataAtIndex && parseFloat(dataAtIndex.year_current) > 0;

          // Regla: 
          // 1. Si es año actual, permitimos hasta el mes presente (aunque sea 0, para ver que no vendimos nada).
          // 2. Si es año pasado, SOLO permitimos meses con ventas.
          // 3. Bloqueamos meses futuros del año actual.
          
          let isDisabled = true;

          if (selectedYear === currentYear) {
              // Año actual: Habilitar hasta el mes actual
              if (monthNum <= currentMonth) isDisabled = false;
          } else {
              // Año pasado: Solo habilitar si hubo ventas
              if (hasSales) isDisabled = false;
          }

          return { 
              value: monthNum, 
              label: name,
              disabled: isDisabled
          };
      });
  }, [yearComparison, selectedYear, currentYear, currentMonth, monthsList]);

  // 3. AUTO-CORRECCIÓN: Si el mes seleccionado ahora está deshabilitado, cámbialo al último válido
  useEffect(() => {
      const currentOpt = monthOptions.find(o => o.value === selectedMonth);
      if (currentOpt && currentOpt.disabled) {
          // Buscar el último mes válido disponible
          const validMonths = monthOptions.filter(o => !o.disabled);
          if (validMonths.length > 0) {
              const lastValid = validMonths[validMonths.length - 1].value;
              setSelectedMonth(lastValid);
          }
      }
  }, [selectedYear, monthOptions, selectedMonth, setSelectedMonth]);

  const isHistorical = useMemo(() => {
      if (selectedYear < currentYear) return true;
      if (selectedYear === currentYear && selectedMonth < currentMonth) return true;
      return false;
  }, [selectedYear, selectedMonth, currentYear, currentMonth]);

  // ... (useEffects para setKpiPeriod y annualSummary igual que antes) ...
  // (Para no pegar código repetido, usa los mismos de mi respuesta anterior para annualSummary y CustomTooltip)
  const annualSummary = useMemo(() => {
      if (!yearComparison?.data) return { totalCurrent: 0, growth: 0 };
      const totalCurrent = yearComparison.data.reduce((acc, curr) => acc + (parseFloat(curr.year_current) || 0), 0);
      const totalPast = yearComparison.data.reduce((acc, curr) => acc + (parseFloat(curr.year_past) || 0), 0);
      let growth = 0;
      if (totalPast > 0) growth = ((totalCurrent - totalPast) / totalPast) * 100;
      else if (totalCurrent > 0) growth = 100;
      return { totalCurrent, growth };
  }, [yearComparison]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const current = payload.find(p => p.dataKey === 'year_current')?.value || 0;
      const past = payload.find(p => p.dataKey === 'year_past')?.value || 0;
      const dataItem = payload[0].payload; 
      const percent = dataItem.growth_percentage || '0%';

      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 text-xs z-50">
          <p className="font-bold mb-2 text-gray-500 uppercase">{label}</p>
          <div className="space-y-1">
              <p className="font-bold text-primary flex justify-between gap-4">
                  <span>{selectedYear}:</span> 
                  <span>{current.toLocaleString()} {t('common.currency')}</span>
              </p>
              <p className="font-bold text-gray-400 flex justify-between gap-4">
                  <span>{selectedYear - 1}:</span> 
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
    <div className="space-y-6 pb-10 animate-fade-in">
      
      {/* HEADER & FILTROS BONITOS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">{t('dashboard_summary_title')}</h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
             {isHistorical ? (
                 <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <Clock size={12}/> Histórico
                 </span>
             ) : (
                 <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <TrendingUp size={12}/> En Vivo
                 </span>
             )}
             <p className="hidden sm:block">| {t('dashboard_summary_subtitle')}</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            {/* SELECTOR DE MES ESTILIZADO */}
            <div className="w-full md:w-40">
                <ModernSelect 
                    options={monthOptions} 
                    value={selectedMonth} 
                    onChange={setSelectedMonth} 
                    placeholder="Mes"
                />
            </div>
            
            {/* SELECTOR DE AÑO ESTILIZADO */}
            <div className="w-full md:w-32">
                <ModernSelect 
                    options={yearOptions} 
                    value={selectedYear} 
                    onChange={setSelectedYear} 
                    placeholder="Año"
                />
            </div>
        </div>
      </div>

      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="col-span-full flex justify-end mb-[-10px]">
            {!isHistorical && (
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex text-xs font-bold">
                   <button onClick={() => setKpiPeriod('day')} className={`px-3 py-1 rounded transition ${kpiPeriod === 'day' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('today')}</button>
                   <button onClick={() => setKpiPeriod('month')} className={`px-3 py-1 rounded transition ${kpiPeriod === 'month' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('this_month')}</button>
                </div>
            )}
         </div>

         <KpiCard title={t('total_sales')} value={kpis.total_revenue} icon={<DollarSign/>} color="text-blue-600" bg="bg-blue-50"/>
         <KpiCard title={t('net_profit')} value={kpis.net_profit} icon={<TrendingUp/>} color="text-green-600" bg="bg-green-50"/>
         <KpiCard title={t('average_ticket')} value={kpis.average_ticket} icon={<ShoppingBag/>} color="text-purple-600" bg="bg-purple-50"/>
         <KpiCard title={t('profit_margin')} value={kpis.profit_margin} icon={<Award/>} color="text-orange-600" bg="bg-orange-50" isPercent/>
      </div>

      {/* 2. CANALES DE VENTA (Corrección día) */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800 dark:text-white">
                  <Utensils size={20} className="text-primary"/> {t('what_sells_more_title')}
              </h3>
              
              {!isHistorical ? (
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                      {['day', 'week', 'month', 'year'].map((p) => (
                          <button key={p} onClick={() => setChannelPeriod(p)} className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition ${channelPeriod === p ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
                              {p === 'day' ? t('today') : p === 'week' ? t('week') : p === 'month' ? t('month') : t('year')}
                          </button>
                      ))}
                  </div>
              ) : (
                  <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">
                      {t('month')} {monthsList[selectedMonth - 1]}
                  </span>
              )}
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

      {/* 3. COMPARATIVA Y TOP (RESTO IGUAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICA */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[380px] flex flex-col">
           <div className="flex justify-between items-start mb-2">
               <div>
                   <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white"><Calendar size={18}/> {t('annual_performance_title')}</h3>
                   <p className="text-xs text-gray-500">{t('comparing_years', { current_year: selectedYear, compared_to: selectedYear - 1 })}</p>
               </div>
               <div className="text-right">
                   <p className="text-xs text-gray-400 font-bold uppercase">{t('total_year', { year: selectedYear })}</p>
                   <p className="text-2xl font-black text-primary">{annualSummary.totalCurrent.toLocaleString()} {t('common.currency')}</p>
                   <p className={`text-xs font-bold ${annualSummary.growth >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center justify-end gap-1`}>
                       {annualSummary.growth >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                       {annualSummary.growth.toFixed(1)}% {t('global_growth')}
                   </p>
               </div>
           </div>

           <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={yearComparison.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 12, fill: '#94a3b8'}}/>
                      <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}}/>
                      <Bar dataKey="year_past" name={`${t('common.yearLabel')} ${selectedYear - 1}`} fill="#e2e8f0" radius={[4,4,4,4]} barSize={12} />
                      <Bar dataKey="year_current" name={`${t('common.yearLabel')} ${selectedYear}`} fill="#6366f1" radius={[4,4,4,4]} barSize={12} />
                   </BarChart>
               </ResponsiveContainer>
           </div>
        </div>

        {/* TOP GANANCIAS */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[380px] overflow-hidden flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-green-700 dark:text-green-400">💰 {t('top_profits_title')}</h3>
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {topProfitable.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <p>{t('invoiceHistory.noInvoicesInPeriod')}</p>
                    </div>
                ) : (
                    topProfitable.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 transition">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-400 text-sm">#{idx + 1}</span>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{item.name}</p>
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
                    ))
                )}
            </div>
        </div>
      </div>

      {/* 4. GRÁFICOS INFERIORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm h-[350px]">
             <h3 className="font-bold text-lg mb-4 flex gap-2 items-center dark:text-white">
                <PieIcon size={20} className="text-purple-500"/> 
                {t('top_selling_title')} ({monthsList[selectedMonth - 1]})
             </h3>
             {topProducts.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-gray-400 pb-10">
                     {t('invoiceHistory.noInvoicesInPeriod')}
                 </div>
             ) : (
                 <ResponsiveContainer width="100%" height="90%">
                     <PieChart>
                         <Pie
                             data={topProducts}
                             cx="50%" cy="50%"
                             innerRadius={60} outerRadius={80}
                             paddingAngle={5}
                             dataKey="sold"
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
             )}
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