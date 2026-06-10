import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';
import { Button, Input, ThemeToggle } from '@feedo/ui';

/**
 * Real entry is by scanning a table QR (→ /t/:qrToken). This screen is the
 * fallback for opening the app directly: enter a restaurant handle.
 */
export function EntryPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
        <span className="text-xl font-bold">F</span>
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Order with Feedo</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <QrCode className="h-4 w-4" /> Scan the QR on your table to begin
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (slug.trim()) navigate(`/r/${slug.trim()}`);
        }}
        className="mt-8 flex w-full max-w-xs gap-2"
      >
        <Input
          placeholder="restaurant handle"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={!slug.trim()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">e.g. the-copper-kitchen</p>
    </div>
  );
}
