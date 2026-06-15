import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';
import { Button, Input } from '@feedo/ui';
import { slugify } from '@feedo/utils';

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

      <span className="text-4xl font-black italic leading-none tracking-tight text-foreground">feedu</span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Order with feedu</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <QrCode className="h-4 w-4" /> Scan the QR on your table to begin
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Accept either a handle or the restaurant's name — normalise to the slug.
          const handle = slugify(slug.trim());
          if (handle) navigate(`/r/${handle}`);
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
