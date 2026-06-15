import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/api.js';
import { DashboardLayout } from './components/DashboardLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { BranchesPage } from './pages/BranchesPage.js';
import { MenuPage } from './pages/MenuPage.js';
import { LoyaltyPage } from './pages/LoyaltyPage.js';
import { TablesPage } from './pages/TablesPage.js';
import { StaffPage } from './pages/StaffPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SupportPage } from './pages/SupportPage.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
