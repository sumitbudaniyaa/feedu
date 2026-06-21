import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/api.js';
import { ConsoleLayout } from './components/ConsoleLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { RestaurantsPage } from './pages/RestaurantsPage.js';
import { RestaurantDetailPage } from './pages/RestaurantDetailPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { LeadsPage } from './pages/LeadsPage.js';
import { AccountPage } from './pages/AccountPage.js';
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
            <ConsoleLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<OverviewPage />} />
        <Route path="/brands" element={<Navigate to="/restaurants" replace />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="/employees" element={<UsersPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
