import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@feedo/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Customer app is dark-mode only — no toggle. Versioned storage key resets any stale light pref. */}
    <ThemeProvider storageKey="feedo-customer-theme-dark-v2" defaultMode="dark" defaultAccent="violet">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
