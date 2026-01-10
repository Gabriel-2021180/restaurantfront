import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, Sun, Moon, Languages, LayoutDashboard, 
  UtensilsCrossed, Layers, TicketPercent, Square, 
  DollarSign, Settings, ClipboardList, Package,
  ChefHat, TrendingUp, LogOut, Users, FileText, Shield, Award, ShoppingBag 
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Layout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { hasRole, logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const changeLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const isStrictWaiter = () => {
      if (!user || !user.role) return false;
      const roleName = (user.role.slug || user.role.name || user.role).toLowerCase();
      return roleName === 'waiter' || roleName === 'mesero';
  };

  const navLinkClasses = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
      isActive 
        ? 'bg-primary text-white shadow-md shadow-indigo-200 dark:shadow-none' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-card shadow-lg transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        
        <div className="flex items-center justify-center h-16 border-b dark:border-gray-700 shrink-0">
          <h1 className="text-2xl font-bold text-primary dark:text-primary-light">RestoAdmin</h1>
        </div>
        
        <nav className="mt-6 px-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar pb-4">
          
          {hasRole(['super-admin', 'admin']) && (
            <NavLink to="/" className={navLinkClasses} end>
                <LayoutDashboard size={20} />
                <span>{t('dashboard')}</span>
            </NavLink>
          )}

          {hasRole(['super-admin', 'admin', 'cashier']) && (
            <NavLink to="/admin/report" className={navLinkClasses}>
                <TrendingUp size={20} />
                <span>Resumen del Día</span>
            </NavLink>
          )}

          <NavLink to="/tables" className={navLinkClasses}>
            <Square size={20} />
            <span>Mesas</span>
          </NavLink>

          {/* NUEVO: PARA LLEVAR */}
          {hasRole(['super-admin', 'admin', 'cashier']) && (
            <NavLink to="/pickup" className={navLinkClasses}>
                <ShoppingBag size={20} />
                <span>Para Llevar</span>
            </NavLink>
          )}
          
          {hasRole(['super-admin', 'admin']) && (
              <NavLink to="/tables" className={navLinkClasses}>
                <ClipboardList size={20} />
                <span>Comandas Activas</span>
              </NavLink>
          )}

          {hasRole(['super-admin', 'admin']) && (
            <>
                <NavLink to="/products" className={navLinkClasses}>
                    <UtensilsCrossed size={20} />
                    <span>Productos</span>
                </NavLink>
                <NavLink to="/categories" className={navLinkClasses}>
                    <Layers size={20} />
                    <span>Categorías</span>
                </NavLink>
            </>
          )}

          {hasRole(['super-admin', 'admin', 'waiter']) && (
             <NavLink to="/promotions" className={navLinkClasses}>
                <TicketPercent size={20} />
                <span>Promociones</span>
            </NavLink>
          )}

          {isStrictWaiter() && (
             <NavLink to="/tips" className={navLinkClasses}>
                <Award size={20} />
                <span>Mis Propinas</span>
            </NavLink>
          )}

          {hasRole(['super-admin', 'admin', 'chef']) && (
            <NavLink to="/inventory" className={navLinkClasses}>
                <Package size={20} />
                <span>Insumos</span>
            </NavLink>
          )}

          {(hasRole(['super-admin', 'admin', 'cashier'])) && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Caja</p>
                <NavLink to="/cashier" className={navLinkClasses}>
                    <DollarSign size={20} />
                    <span>Caja Principal</span>
                </NavLink>
                <NavLink to="/admin/invoices" className={navLinkClasses}>
                    <FileText size={20} />
                    <span>Facturas</span>
                </NavLink>
                {hasRole(['super-admin', 'admin']) && (
                    <NavLink to="/settings/finance" className={navLinkClasses}>
                        <Settings size={20} />
                        <span>Configuración</span>
                    </NavLink>
                )}
            </div>
          )}

          {hasRole('super-admin') && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Admin</p>
                <NavLink to="/users" className={navLinkClasses}>
                    <Users size={20} />
                    <span>Usuarios</span>
                </NavLink>
                <NavLink to="/admin/staff-dashboard" className={navLinkClasses}>
                    <Shield size={20} />
                    <span>Control Personal</span>
                </NavLink>
            </div>
          )}

          {hasRole(['super-admin', 'admin', 'chef']) && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <NavLink to="/kitchen" className={navLinkClasses}>
                    <ChefHat size={20} />
                    <span>Monitor Cocina</span>
                </NavLink>
            </div>
          )}

          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-500 w-full hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-bold mt-2">
            <LogOut size={20}/> <span>Cerrar Sesión</span>
          </button>

        </nav>
      </aside>
      
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
                {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50 dark:bg-dark-bg">
          {children}
        </main>
      </div>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-black opacity-50 md:hidden"></div>}
    </div>
  );
};

export default Layout;