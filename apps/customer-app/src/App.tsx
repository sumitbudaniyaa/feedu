import { Navigate, Route, Routes } from 'react-router-dom';
import { EntryPage } from './pages/EntryPage.js';
import { MenuPage } from './pages/MenuPage.js';
import { CartPage } from './pages/CartPage.js';
import { RewardsPage } from './pages/RewardsPage.js';
import { AccountPage } from './pages/AccountPage.js';
import { TrackPage } from './pages/TrackPage.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      {/* Scanned QR token */}
      <Route path="/t/:qrToken" element={<MenuPage mode="qr" />} />
      {/* Direct restaurant link */}
      <Route path="/r/:slug" element={<MenuPage mode="slug" />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/rewards" element={<RewardsPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/order/:orderId" element={<TrackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
