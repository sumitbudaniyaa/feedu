import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider, ThemeProvider } from '@feedo/ui';
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
    <ThemeProvider storageKey="feedo-admin-theme" defaultMode="dark" defaultAccent="violet">
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
