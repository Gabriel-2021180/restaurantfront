import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PÚBLICAS */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/print/kitchen/:orderId" element={<KitchenPrintView />} />
          
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
                  
                  {/* REPORTE DIARIO: Agregamos 'cashier' para que vea el corte del día */}
                  <Route path="/admin/report" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <DailyReport />
                      </ProtectedRoute>
                  } />

                  {/* USUARIOS: Solo Super Admin */}
                  <Route path="/users" element={
                      <ProtectedRoute allowedRoles={['super-admin']}>
                          <UsersPage />
                      </ProtectedRoute>
                  } />

                  <Route path="/admin/invoices" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <InvoiceHistory />
                      </ProtectedRoute>
                  } />

                  <Route path="/cashier" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'cashier']}>
                          <CashierDashboard />
                      </ProtectedRoute>
                  } />

                  <Route path="/settings/finance" element={
                      <ProtectedRoute allowedRoles={['super-admin']}>
                          <FinanceSettings />
                      </ProtectedRoute>
                  } />

                  <Route path="/inventory" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'chef']}>
                          <Supplies />
                      </ProtectedRoute>
                  } />

                  {/* COCINA: Agregamos 'cashier' por si acaso */}
                  <Route path="/kitchen" element={
                      <ProtectedRoute allowedRoles={['super-admin', 'admin', 'chef', 'cashier']}>
                          <KitchenControl />
                      </ProtectedRoute>
                  } />

                  {/* RESTO DE RUTAS */}
                  <Route path="/products" element={<Products />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/orders/:orderId" element={<OrderManager />} />
                  <Route path="/promotions" element={<Promotions />} />
                  
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