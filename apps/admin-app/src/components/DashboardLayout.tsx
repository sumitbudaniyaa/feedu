import { motion } from 'framer-motion';
import {
  BarChart3,
  Boxes,
  Building2,
  ChefHat,
  LayoutGrid,
  LifeBuoy,
  Lock,
  LogOut,
  QrCode,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  UserRound,
} from 'lucide-react';
import { useEffect } from 'react';
import {
  Avatar,
  AvatarFallback,
  Button,
  Separator,
  ThemeToggle,
  cn,
  useTheme,
} from '@feedo/ui';
import { initials } from '@feedo/utils';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useBrand, useLogout, useMe, useRestaurant, useSubscription } from '../lib/api.js';
import { useLiveSync } from '../lib/useLiveSync.js';
import { WaiterCallDrawer } from './WaiterCallDrawer.js';
import { WaiterApp } from './WaiterApp.js';
import { BranchSwitcher } from './BranchSwitcher.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/branches', label: 'Branches', icon: Building2, brandOnly: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/menu', label: 'Menu CMS', icon: ChefHat },
  { to: '/loyalty', label: 'Loyalty', icon: Sparkles },
  { to: '/tables', label: 'Tables & QR', icon: QrCode },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/customers', label: 'Customers', icon: UserRound },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/settings', label: 'Settings', icon: Settings },
];

// Waiters get a trimmed app: just orders + inventory.
const WAITER_PATHS = new Set(['/orders', '/inventory']);
// Brand-wide roles see brand-level pages (e.g. Branches).
const BRAND_WIDE = new Set(['owner', 'brand_owner', 'brand_admin']);

export function DashboardLayout() {
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const tokens = useAuth((s) => s.tokens);
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccent } = useTheme();

  const { data: brand } = useBrand();
  const isWaiter = user?.role === 'waiter';
  const isBrandWide = BRAND_WIDE.has(user?.role ?? '');
  // Branch features only for brand-wide roles on a multi-store account.
  const isMultiStore = isBrandWide && brand?.accountType === 'multi';
  const nav = isWaiter
    ? NAV.filter((n) => WAITER_PATHS.has(n.to))
    : NAV.filter((n) => !n.brandOnly || isMultiStore);

  // Keep waiters out of pages they can't access (deep-links / refresh land on Orders).
  useEffect(() => {
    if (isWaiter && !WAITER_PATHS.has(location.pathname)) {
      navigate('/orders', { replace: true });
    }
  }, [isWaiter, location.pathname, navigate]);

  // Realtime order/analytics sync.
  useLiveSync();

  // Hydrate the current user (refresh-safe) and apply restaurant branding accent.
  const { data: me } = useMe();
  const { data: restaurant } = useRestaurant(Boolean(tokens?.accessToken));
  const { data: subscription } = useSubscription();

  useEffect(() => {
    if (me && tokens) setSession(me, tokens);
  }, [me, tokens, setSession]);

  useEffect(() => {
    if (restaurant?.branding?.accent) setAccent(restaurant.branding.accent);
  }, [restaurant?.branding?.accent, setAccent]);

  // Lock the whole app when the restaurant is suspended or its subscription lapsed.
  const subExpired = Boolean(
    subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date(),
  );
  const locked =
    restaurant != null &&
    (restaurant.isLive === false ||
      subscription?.status === 'past_due' ||
      subscription?.status === 'cancelled' ||
      subExpired);

  if (locked) {
    return <LockScreen onLogout={() => { logout(); navigate('/login'); }} restaurantLive={restaurant?.isLive !== false} />;
  }

  // Waiters get a dedicated mobile app (live table calls + orders).
  if (isWaiter) return <WaiterApp />;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <WaiterCallDrawer variant="toast" />
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-5 lg:flex">
        <div className="flex items-center px-3 pb-6">
          <span className="text-2xl font-black italic leading-none tracking-tight text-foreground">
            feedu
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator className="my-3" />
        <div className="flex items-center gap-3 px-2">
          <Avatar>
            <AvatarFallback>{initials(user?.name ?? 'Feedu')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Owner'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-lg font-black italic tracking-tight text-foreground">feedu</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isMultiStore && <BranchSwitcher />}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 px-4 py-4"
        >
          <div className="w-full">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
}

function LockScreen({ onLogout, restaurantLive }: { onLogout: () => void; restaurantLive: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        {restaurantLive ? 'Subscription inactive' : 'Restaurant suspended'}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {restaurantLive
          ? 'Your Feedu subscription is past due, cancelled or expired, so the dashboard and your ordering page are locked.'
          : 'This restaurant has been suspended, so the dashboard and your ordering page are offline.'}{' '}
        Please contact Feedu to restore access.
      </p>
      <Button variant="outline" className="mt-6" onClick={onLogout}>
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </div>
  );
}
