import { useState } from 'react';
import { Boxes, LogOut, ShoppingBag } from 'lucide-react';
import { ThemeToggle } from '@feedo/ui';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../lib/api.js';
import { OrdersPage } from '../pages/OrdersPage.js';
import { InventoryPage } from '../pages/InventoryPage.js';
import { WaiterCallDrawer } from './WaiterCallDrawer.js';

/** Mobile waiter app: Orders + Inventory, with table calls arriving as a ringing drawer. */
export function WaiterApp() {
  const logout = useLogout();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'orders' | 'inventory'>('orders');

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <span className="text-xl font-black italic tracking-tight">feedu</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Waiter</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-3 pb-24 pt-3">{tab === 'orders' ? <OrdersPage /> : <InventoryPage />}</main>

      {/* Floating pill bottom nav */}
      <nav className="fixed inset-x-0 bottom-5 z-20 flex justify-center">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-elevated backdrop-blur">
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={ShoppingBag} label="Orders" />
          <TabButton active={tab === 'inventory'} onClick={() => setTab('inventory')} icon={Boxes} label="Inventory" />
        </div>
      </nav>

      {/* Incoming table calls — ringing drawer with slide-to-attend */}
      <WaiterCallDrawer />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-accent text-accent-foreground shadow-soft' : 'text-muted-foreground hover:bg-secondary'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
