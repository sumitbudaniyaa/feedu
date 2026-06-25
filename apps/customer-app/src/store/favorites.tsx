import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { cn } from '@feedo/ui';
import type { Product } from '@feedo/types';
import { useAddFavorite, useAuth, useFavorites, useRemoveFavorite } from '../lib/api.js';

interface FavoritesCtx {
  ids: Set<string>;
  isAuthed: boolean;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const Ctx = createContext<FavoritesCtx | null>(null);

/** Server-backed favorites (per OTP-verified diner, per restaurant). */
export function FavoritesProvider({ slug, children }: { slug?: string; children: ReactNode }) {
  const navigate = useNavigate();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  const { data } = useFavorites(slug, isAuthed);
  const add = useAddFavorite(slug ?? '');
  const remove = useRemoveFavorite(slug ?? '');

  const ids = useMemo(() => new Set(data?.productIds ?? []), [data]);

  const value = useMemo<FavoritesCtx>(
    () => ({
      ids,
      isAuthed,
      isFavorite: (id) => ids.has(id),
      toggle: (id) => {
        // Favorites are tied to the verified account → send guests to sign in first.
        if (!isAuthed) {
          navigate('/rewards');
          return;
        }
        if (ids.has(id)) remove.mutate(id);
        else add.mutate(id);
      },
    }),
    [ids, isAuthed, add, remove, navigate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Optional — returns null when rendered outside a FavoritesProvider. */
export function useFavoritesCtx() {
  return useContext(Ctx);
}

/** Heart toggle, overlaid on a product image. `tone` matches the surface it sits on. */
export function FavoriteButton({
  productId,
  className,
  tone = 'dark',
}: {
  productId: string;
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const fav = useFavoritesCtx();
  if (!fav) return null;
  const active = fav.isFavorite(productId);
  return (
    <button
      type="button"
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.stopPropagation();
        fav.toggle(productId);
      }}
      className={cn(
        'flex items-center justify-center rounded-full backdrop-blur-sm transition-transform active:scale-90',
        tone === 'dark' ? 'h-7 w-7 bg-black/40' : 'h-9 w-9 bg-background/90 shadow-soft',
        className,
      )}
    >
      <Heart
        className={cn(
          tone === 'dark' ? 'h-4 w-4' : 'h-5 w-5',
          active ? 'fill-red-500 text-red-500' : tone === 'dark' ? 'text-white' : 'text-foreground',
        )}
      />
    </button>
  );
}

/** Horizontal strip of circular favorite dishes shown on the home page. */
export function FavoritesRow({
  products,
  onPick,
}: {
  products: Product[];
  onPick: (product: Product) => void;
}) {
  const fav = useFavoritesCtx();
  if (!fav || !fav.isAuthed) return null;
  const favProducts = products.filter((p) => fav.ids.has(p._id));
  if (favProducts.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <h2 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
        <Heart className="h-4 w-4 fill-red-500 text-red-500" /> Your favorites
      </h2>
      <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1">
        {favProducts.map((p) => (
          <button
            key={p._id}
            type="button"
            onClick={() => onPick(p)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="h-16 w-16 overflow-hidden rounded-full border-2 border-accent">
              {p.image?.url ? (
                <img src={p.image.url} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-secondary text-lg font-semibold text-muted-foreground">
                  {p.name[0]}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-center text-[11px] leading-tight">{p.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
