import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, LayoutGrid, LifeBuoy, LogOut, ReceiptText, Settings, UserRound, Users } from 'lucide-react';
import { Avatar, AvatarFallback, Button, Separator, ThemeToggle, cn } from '@feedo/ui';
import { initials } from '@feedo/utils';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, useLogout, useMe } from '../lib/api.js';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/restaurants', label: 'Restaurants', icon: Building2 },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/customers', label: 'Customers', icon: UserRound },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/account', label: 'Account', icon: Settings },
];

export function ConsoleLayout() {
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const tokens = useAuth((s) => s.tokens);
  const logout = useLogout();
  const navigate = useNavigate();

  const { data: me } = useMe();
  useEffect(() => {
    if (me && tokens) setSession(me, tokens);
  }, [me, tokens, setSession]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-5 lg:flex">
        <div className="flex items-baseline gap-1.5 px-3 pb-6">
          <span className="text-2xl font-black italic leading-none tracking-tight text-foreground">
            feedu
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
            <AvatarFallback>{initials(user?.name ?? 'Super Admin')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Super Admin'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
          <span className="text-lg font-black italic tracking-tight text-foreground lg:hidden">
            feedu<span className="ml-1 align-middle text-[10px] font-semibold uppercase not-italic tracking-widest text-muted-foreground">Platform</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={() => {
                logout();
                navigate('/login');
              }}
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
