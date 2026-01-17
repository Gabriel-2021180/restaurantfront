import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import Layout from "../components/layout/Layout";

// Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import UsersPage from '../pages/admin/UsersPage'; 
import Dashboard from "../pages/dashboard/Dashboard";
import Products from "../pages/products/Products";
import Categories from "../pages/categories/Categories";
import Promotions from "../pages/marketing/Promotions";
import Tables from "../pages/tables/Tables"; 
import OrderManager from "../pages/orders/OrderManager";
import CashierDashboard from '../pages/cashier/CashierDashboard';
import FinanceSettings from '../pages/admin/FinanceSettings';
import InvoiceHistory from '../pages/admin/InvoiceHistory';
import KitchenControl from '../pages/kitchen/KitchenControl';
import DailyReport from '../pages/admin/DailyReport';
import KitchenPrintView from '../pages/kitchen/KitchenPrintView';
import Supplies from '../pages/inventory/Supplies'; 
import StaffDashboard from '../pages/admin/StaffDashboard';
import ForgotPassword from '../pages/auth/ForgotPassword';
import PickupPoint from '../pages/orders/PickupPoint';
import UserProfile from '../pages/profile/UserProfile';
import RequireSecuritySetup from '../components/auth/RequireSecuritySetup';
import TipsPage from '../pages/waiter/TipsPage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/print/kitchen/:orderId" element={<KitchenPrintView />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* RUTAS PROTEGIDAS */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <RequireSecuritySetup>
                <Layout>
                  <Routes>
                    {/* Perfil de usuario: accesible para todos los logueados */}
                    <Route path="/profile" element={<UserProfile />} />

                    {/* Dashboard: Super Admin y Admin */}
                    <Route path="/" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Reporte Diario: Super Admin, Admin y Cajero */}
                    <Route path="/admin/report" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                        <DailyReport />
                      </ProtectedRoute>
                    } />

                    {/* Para llevar/Pickup: Super Admin, Admin y Cajero */}
                    <Route path="/pickup" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                        <PickupPoint />
                      </ProtectedRoute>
                    } />

                    {/* Gestión de Usuarios: Solo Super Admin */}
                    <Route path="/users" element={
                      <ProtectedRoute allowedRoles={['super-admin']}>
                        <UsersPage />
                      </ProtectedRoute>
                    } />

                    {/* Rendimiento del Personal: Solo Super Admin */}
                    <Route path="/admin/staff-dashboard" element={
                      <ProtectedRoute allowedRoles={['super-admin']}>
                          <StaffDashboard />
                      </ProtectedRoute>
                    } />

                    {/* Propinas: Solo Mesero */}
                    <Route path="/tips" element={
                      <ProtectedRoute allowedRoles={['waiter']}>
                        <TipsPage />
                      </ProtectedRoute>
                    } />

                    {/* Historial de Facturas: Super Admin, Admin y Cajero */}
                    <Route path="/admin/invoices" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                        <InvoiceHistory />
                      </ProtectedRoute>
                    } />

                    {/* Dashboard de Caja: Super Admin, Admin y Cajero */}
                    <Route path="/cashier" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                        <CashierDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Monitor de Cocina: Super Admin, Admin y Cajero */}
                    <Route path="/kitchen" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                        <KitchenControl />
                      </ProtectedRoute>
                    } />

                    {/* Configuración Financiera: Super Admin y Admin */}
                    <Route path="/settings/finance" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                        <FinanceSettings />
                      </ProtectedRoute>
                    } />

                    {/* Inventario: Super Admin y Admin */}
                    <Route path="/inventory" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                        <Supplies />
                      </ProtectedRoute>
                    } />

                    {/* Gestión de Menú: Super Admin y Admin */}
                    <Route path="/products" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                        <Products />
                      </ProtectedRoute>
                    } />
                    <Route path="/categories" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                        <Categories />
                      </ProtectedRoute>
                    } />
                    
                    {/* Promociones: Super Admin, Admin y Mesero */}
                    <Route path="/promotions" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'waiter']}>
                        <Promotions />
                      </ProtectedRoute>
                    } />

                    {/* Mesas: Super Admin, Admin y Mesero (Cajero NO) */}
                    <Route path="/tables" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'waiter']}>
                        <Tables />
                      </ProtectedRoute>
                    } />

                    {/* Detalle de orden: Accesible a todos los autenticados por ahora */}
                    <Route path="/orders/:orderId" element={<OrderManager />} />
                    
                    {/* Redirección para cualquier otra ruta no encontrada */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </RequireSecuritySetup>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
