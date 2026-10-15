import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageFallback } from '@/components/layout/PageFallback'
import { SecuritySetupGate } from '@/features/auth/SecuritySetupGate'
import type { SystemRole } from '@/types/auth'
import { GuestOnly, RequireAuth, RequireRole, RoleHome } from './guards'

const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load)

const Login = page(() => import('@/features/auth/LoginPage'))
const Register = page(() => import('@/features/auth/RegisterPage'))
const ForgotPassword = page(() => import('@/features/auth/ForgotPasswordPage'))

interface AppRoute {
  path: string
  Component: LazyExoticComponent<ComponentType>
  roles?: SystemRole[]
  strict?: boolean
}

/** Rutas protegidas; los roles coinciden con el menú (app/navigation.ts). */
const ROUTES: AppRoute[] = [
  { path: '/profile', Component: page(() => import('@/features/profile/ProfilePage')) },
  { path: '/orders/:orderId', Component: page(() => import('@/features/orders/OrderPage')), roles: ['admin', 'waiter'] },
  { path: '/tables', Component: page(() => import('@/features/tables/TablesPage')), roles: ['admin', 'waiter'] },
  { path: '/reservations', Component: page(() => import('@/features/reservations/ReservationsPage')), roles: ['admin', 'waiter', 'cashier'] },
  { path: '/pickup', Component: page(() => import('@/features/pickup/PickupPage')), roles: ['admin', 'cashier', 'waiter'] },
  { path: '/my-shift', Component: page(() => import('@/features/cashier/MyShiftPage')), roles: ['cashier'], strict: true },
  { path: '/kitchen', Component: page(() => import('@/features/kitchen/KitchenPage')), roles: ['admin', 'cashier', 'chef'] },
  { path: '/cashier', Component: page(() => import('@/features/cashier/CashierPage')), roles: ['admin', 'cashier'] },
  { path: '/reports', Component: page(() => import('@/features/reports/ReportsPage')), roles: ['admin'] },
  { path: '/admin/report', Component: page(() => import('@/features/reports/DaySummaryPage')), roles: ['admin'] },
  { path: '/admin/invoices', Component: page(() => import('@/features/invoices/InvoicesPage')), roles: ['admin', 'cashier'] },
  { path: '/admin/shifts', Component: page(() => import('@/features/cashier/ShiftHistoryPage')), roles: ['admin'] },
  { path: '/products', Component: page(() => import('@/features/products/ProductsPage')), roles: ['admin'] },
  { path: '/categories', Component: page(() => import('@/features/products/CategoriesPage')), roles: ['admin'] },
  { path: '/promotions', Component: page(() => import('@/features/promotions/PromotionsPage')), roles: ['admin', 'cashier', 'waiter'] },
  { path: '/inventory', Component: page(() => import('@/features/inventory/InventoryPage')), roles: ['admin', 'chef'] },
  { path: '/tips', Component: page(() => import('@/features/tips/TipsPage')), roles: ['waiter'], strict: true },
  { path: '/users', Component: page(() => import('@/features/users/UsersPage')), roles: ['super-admin'] },
  { path: '/admin/staff-dashboard', Component: page(() => import('@/features/staff/StaffPage')), roles: ['super-admin'] },
  { path: '/settings/finance', Component: page(() => import('@/features/settings/SettingsPage')), roles: ['super-admin'] },
]

const Dashboard = page(() => import('@/features/dashboard/DashboardPage'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />

          <Route
            element={
              <RequireAuth>
                <SecuritySetupGate>
                  <AppShell />
                </SecuritySetupGate>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <RoleHome>
                  <Suspense fallback={<PageFallback />}>
                    <Dashboard />
                  </Suspense>
                </RoleHome>
              }
            />
            {ROUTES.map(({ path, Component, roles, strict }) => {
              const content = (
                <Suspense fallback={<PageFallback />}>
                  <Component />
                </Suspense>
              )
              return (
                <Route
                  key={path}
                  path={path}
                  element={roles ? <RequireRole roles={roles} strict={strict}>{content}</RequireRole> : content}
                />
              )
            })}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
