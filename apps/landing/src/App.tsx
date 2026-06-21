import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './components/Home';
import { LeadForm } from './pages/LeadForm';
import { About } from './pages/About';
import { PrivacyPolicy, Terms } from './pages/Legal';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/contact-sales" element={<LeadForm kind="sales" />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
