import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, Sun, Moon, Languages, LayoutDashboard, 
  UtensilsCrossed, Layers, TicketPercent, Square, 
  DollarSign, Settings, ClipboardList, Package,
  ChefHat, TrendingUp, LogOut, Users, FileText 
} from 'lucide-react';
import { useLocation, NavLink } from 'react-router-dom';

const Layout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { hasRole, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const changeLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const navLinkClasses = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
      isActive 
        ? 'bg-primary text-white shadow-md shadow-indigo-200 dark:shadow-none' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-card shadow-lg transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        
        <div className="flex items-center justify-center h-16 border-b dark:border-gray-700 shrink-0">
          <h1 className="text-2xl font-bold text-primary dark:text-primary-light">RestoAdmin</h1>
        </div>
        
        <nav className="mt-6 px-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar pb-4">
          
          {/* 1. DASHBOARD GRÁFICO (Solo Jefes) */}
          {hasRole(['super-admin', 'admin']) && (
            <NavLink to="/" className={navLinkClasses} end>
                <LayoutDashboard size={20} />
                <span>{t('dashboard')}</span>
            </NavLink>
          )}

          {/* 2. OPERATIVO (Meseros y Admins - El Cajero NO necesita ver productos) */}
          {hasRole(['super-admin', 'admin', 'waiter']) && (
            <>
                <NavLink to="/tables" className={navLinkClasses}>
                    <Square size={20} />
                    <span>Mesas</span>
                </NavLink>
                
                <NavLink to="/products" className={navLinkClasses}>
                    <UtensilsCrossed size={20} />
                    <span>Productos</span>
                </NavLink>

                <NavLink to="/categories" className={navLinkClasses}>
                    <Layers size={20} />
                    <span>Categorías</span>
                </NavLink>

                <NavLink to="/promotions" className={navLinkClasses}>
                    <TicketPercent size={20} />
                    <span>Promociones</span>
                </NavLink>
            </>
          )}

          {/* 3. INVENTARIO (Solo Admin y Chef) */}
          {hasRole(['super-admin', 'admin', 'chef']) && (
            <NavLink to="/inventory" className={navLinkClasses}>
                <Package size={20} />
                <span>Insumos (Stock)</span>
            </NavLink>
          )}

          {/* 4. ZONA FINANCIERA (Aquí entra el CAJERO) */}
          {(hasRole(['super-admin', 'admin', 'cashier'])) && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Finanzas & Caja</p>
                
                {/* Caja Principal */}
                <NavLink to="/cashier" className={navLinkClasses}>
                    <DollarSign size={20} />
                    <span>Caja (Cobros)</span>
                </NavLink>

                {/* Historial Facturas */}
                <NavLink to="/admin/invoices" className={navLinkClasses}>
                    <FileText size={20} />
                    <span>Historial Facturas</span>
                </NavLink>

                {/* RESUMEN DEL DÍA (Corte de Caja) - AHORA VISIBLE PARA CAJERO */}
                <NavLink to="/admin/report" className={navLinkClasses}>
                    <TrendingUp size={20} />
                    <span>Ingresos del Día</span>
                </NavLink>

                {/* Monitor de Cocina (Por si el cajero ayuda a coordinar) */}
                <NavLink to="/kitchen" className={navLinkClasses}>
                    <ChefHat size={20} />
                    <span>Monitor Cocina</span>
                </NavLink>

                {/* Configuración solo Admins */}
                {hasRole(['super-admin', 'admin']) && (
                    <NavLink to="/settings/finance" className={navLinkClasses}>
                        <Settings size={20} />
                        <span>Config. Facturación</span>
                    </NavLink>
                )}

                {/* Usuarios solo Super Admin */}
                {hasRole('super-admin') && (
                    <NavLink to="/users" className={navLinkClasses}>
                        <Users size={20} />
                        <span>Usuarios</span>
                    </NavLink>
                )}
            </div>
          )}

          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-500 w-full hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-bold mt-2">
            <LogOut size={20}/> <span>Cerrar Sesión</span>
          </button>

        </nav>
      </aside>

      {/* HEADER SUPERIOR */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-dark-card shadow-sm border-b dark:border-gray-700 transition-colors shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-gray-500 dark:text-gray-200">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <button onClick={changeLanguage} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200 transition">
              <Languages className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">{i18n.language}</span>
            </button>

            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-yellow-400 transition">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-bold">
               {/* Inicial del usuario */}
               U
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50 dark:bg-dark-bg">
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-black opacity-50 md:hidden"></div>
      )}
    </div>
  );
};

export default Layout;