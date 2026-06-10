import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/api.js';
import { DashboardLayout } from './components/DashboardLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { PlaceholderPage } from './pages/PlaceholderPage.js';

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
        <Route path="/orders" element={<PlaceholderPage title="Orders" />} />
        <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="/menu" element={<PlaceholderPage title="Menu CMS" />} />
        <Route path="/loyalty" element={<PlaceholderPage title="Loyalty" />} />
        <Route path="/tables" element={<PlaceholderPage title="Tables & QR" />} />
        <Route path="/staff" element={<PlaceholderPage title="Staff" />} />
        <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
