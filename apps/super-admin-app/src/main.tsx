import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider, ThemeProvider, Toaster, toast } from '@feedo/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  // Toast the outcome of every action (create / update / delete).
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      toast.success((mutation.meta?.successMessage as string | undefined) ?? 'Saved');
    },
    onError: (err, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider storageKey="feedo-super-theme" defaultMode="light" defaultAccent="blue">
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster />
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
