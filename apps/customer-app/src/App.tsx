import { Navigate, Route, Routes } from 'react-router-dom';
import { EntryPage } from './pages/EntryPage.js';
import { MenuPage } from './pages/MenuPage.js';
import { TrackPage } from './pages/TrackPage.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      {/* Scanned QR token */}
      <Route path="/t/:qrToken" element={<MenuPage mode="qr" />} />
      {/* Direct restaurant link */}
      <Route path="/r/:slug" element={<MenuPage mode="slug" />} />
      <Route path="/order/:orderId" element={<TrackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
