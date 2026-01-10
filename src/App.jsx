import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider,useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from "./components/layout/Layout";

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import UsersPage from './pages/admin/UsersPage'; 

import Dashboard from "./pages/dashboard/Dashboard";
import Products from "./pages/products/Products";
import Categories from "./pages/categories/Categories";
import Promotions from "./pages/marketing/Promotions";
import Tables from "./pages/tables/Tables"; 
import OrderManager from "./pages/orders/OrderManager";
import CashierDashboard from './pages/cashier/CashierDashboard';
import FinanceSettings from './pages/admin/FinanceSettings';
import InvoiceHistory from './pages/admin/InvoiceHistory';
import KitchenControl from './pages/kitchen/KitchenControl';
import DailyReport from './pages/admin/DailyReport';
import KitchenPrintView from './pages/kitchen/KitchenPrintView';
import Supplies from './pages/inventory/Supplies'; 
import StaffDashboard from './pages/admin/StaffDashboard';
import ForgotPassword from './pages/auth/ForgotPassword';
import PickupPoint from './pages/orders/PickupPoint'; // <--- IMPORTAR
// IMPORTAMOS LA PÁGINA DE PROPINAS
import TipsPage from './pages/waiter/TipsPage';
const WaiterOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  
  // Normalizamos el rol a minúsculas
  const roleName = (user?.role?.slug || user?.role?.name || user?.role || '').toLowerCase();
  
  // Si NO es mesero, lo mandamos al inicio (o a una página 403 si tuvieras)
  // Nota: Aquí excluimos explícitamente a 'admin' y 'super-admin'
  if (roleName !== 'waiter' && roleName !== 'mesero') {
    return <Navigate to="/" replace />;
  }

  return children;
};
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PÚBLICAS */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/print/kitchen/:orderId" element={<KitchenPrintView />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* PROTEGIDAS */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* DASHBOARD: Solo Jefes */}
                  <Route path="/" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                          <Dashboard />
                      </ProtectedRoute>
                  } />
                  
                  {/* REPORTE DIARIO: Jefes + CAJERO */}
                  <Route path="/admin/report" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <DailyReport />
                      </ProtectedRoute>
                  } />

                  <Route path="/pickup" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <PickupPoint />
                      </ProtectedRoute>
                  } />

                  {/* USUARIOS: Solo Super Admin */}
                  <Route path="/users" element={
                      <ProtectedRoute allowedRoles={['super-admin']}>
                          <UsersPage />
                      </ProtectedRoute>
                  } />

                  {/* --- MÓDULO DE MESERO: PROPINAS --- */}
                  <Route path="/tips" element={
                      // Envolvemos con el componente estricto
                      <WaiterOnlyRoute>
                          <TipsPage />
                      </WaiterOnlyRoute>
                  } />

                  {/* FACTURAS: Jefes + CAJERO */}
                  <Route path="/admin/invoices" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <InvoiceHistory />
                      </ProtectedRoute>
                  } />

                  {/* CAJA: Jefes + CAJERO */}
                  <Route path="/cashier" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <CashierDashboard />
                      </ProtectedRoute>
                  } />

                  {/* CONFIG FACTURACIÓN: Solo Jefes */}
                  <Route path="/settings/finance" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin']}>
                          <FinanceSettings />
                      </ProtectedRoute>
                  } />

                  {/* INVENTARIO: Jefes + Chef */}
                  <Route path="/inventory" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'chef']}>
                          <Supplies />
                      </ProtectedRoute>
                  } />

                  {/* --- GESTIÓN MENÚ --- */}
                  
                  {/* PRODUCTOS Y CATEGORÍAS: SOLO JEFES (Mesero NO entra aquí) */}
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
                  
                  {/* PROMOCIONES: Jefes + MESERO (Para verlas) */}
                  <Route path="/promotions" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'waiter']}>
                          <Promotions />
                      </ProtectedRoute>
                  } />

                  {/* OPERATIVO COMÚN */}
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/orders/:orderId" element={<OrderManager />} />
                  <Route path="/kitchen" element={<KitchenControl />} />
                  <Route path="/admin/staff-dashboard" element={
                        <ProtectedRoute allowedRoles={['super-admin']}>
                            <StaffDashboard />
                        </ProtectedRoute>
                    } />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;