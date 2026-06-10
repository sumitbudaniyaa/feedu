import { useParams, useNavigate } from 'react-router-dom';
import { Check, ChefHat, Clock, CookingPot, PartyPopper, Receipt, Sparkles } from 'lucide-react';
import { Button, Card, Skeleton, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { OrderStatus } from '@feedo/types';
import { useTrackOrder } from '../lib/api.js';

const STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: 'pending', label: 'Order placed', icon: Receipt },
  { status: 'confirmed', label: 'Confirmed', icon: Check },
  { status: 'preparing', label: 'Preparing', icon: CookingPot },
  { status: 'ready', label: 'Ready', icon: ChefHat },
  { status: 'served', label: 'Served', icon: PartyPopper },
];

const ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed'];

export function TrackPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useTrackOrder(orderId);

  if (isLoading || !order) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const cancelled = order.status === 'cancelled' || order.status === 'refunded';
  const currentIdx = ORDER.indexOf(order.status);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background p-6">
      <div className="mb-6 text-center">
        <p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {cancelled ? 'Order cancelled' : order.status === 'completed' ? 'All done — enjoy!' : 'Tracking your order'}
        </h1>
      </div>

      {order.loyaltyPointsEarned > 0 && (
        <Card className="mb-4 flex items-center gap-3 border-accent/30 bg-accent/5 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">You earned {order.loyaltyPointsEarned} reward points</p>
            <p className="text-xs text-muted-foreground">Saved to your mobile number for next time.</p>
          </div>
        </Card>
      )}

      {!cancelled && (
        <Card className="p-5">
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const done = currentIdx >= ORDER.indexOf(step.status);
              const active = order.status === step.status;
              const Icon = step.icon;
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                        done ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground',
                        active && 'ring-4 ring-accent/20',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {i < STEPS.length - 1 && <div className={cn('h-6 w-px', done ? 'bg-accent' : 'bg-border')} />}
                  </div>
                  <span className={cn('text-sm font-medium', done ? 'text-foreground' : 'text-muted-foreground')}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mt-4 p-4">
        <p className="mb-2 text-sm font-medium">Items</p>
        <div className="space-y-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity}× {item.name}
              </span>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </Card>

      <Button variant="outline" className="mt-6 w-full" onClick={() => navigate(-1)}>
        Back to menu
      </Button>
    </div>
  );
}
