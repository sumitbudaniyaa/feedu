import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './components/Home.js';
import { LeadForm } from './pages/LeadForm.js';
import { DemoPage } from './pages/DemoPage.js';
import { About } from './pages/About.js';
import { PrivacyPolicy, Terms } from './pages/Legal.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/contact-sales" element={<LeadForm kind="sales" />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      {/* Legacy book-a-demo link → the interactive demo. */}
      <Route path="/book-demo" element={<Navigate to="/demo" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
