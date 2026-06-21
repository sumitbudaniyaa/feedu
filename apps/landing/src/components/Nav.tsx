import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ButtonPrimary, cx } from './primitives';

const LINKS = [
  ['Product', '#product'],
  ['Features', '#features'],
  ['How it works', '#how'],
  ['Use cases', '#use-cases'],
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center md:px-4 md:pt-3"
    >
      <nav
        className={cx(
          'flex w-full max-w-6xl items-center justify-between border-b border-border px-5 py-3.5 transition-all duration-300 md:rounded-[1.25rem] md:border md:px-4 md:py-2.5',
          scrolled ? 'bg-background/90 backdrop-blur md:bg-background/85 md:shadow-[0_6px_28px_-16px_rgba(60,40,20,0.35)]' : 'bg-background md:bg-background/70 md:backdrop-blur',
        )}
      >
        <a href="#" className="flex select-none items-center gap-2 leading-none">
           <span className="text-xl font-black italic tracking-tight">feedu</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonPrimary href="/contact-sales" className="!px-5 !py-2.5">
            Contact sales
          </ButtonPrimary>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="-mr-1 flex h-10 w-10 items-center justify-center text-foreground md:hidden"
        >
          {open ? (
            <X className="h-6 w-6" strokeWidth={1.75} />
          ) : (
            <span className="flex w-6 flex-col gap-[5px]">
              <span className="h-[2px] w-full rounded-full bg-foreground" />
              <span className="h-[2px] w-full rounded-full bg-foreground" />
            </span>
          )}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-0 top-full border-b border-border bg-background p-5 shadow-[0_12px_28px_-18px_rgba(60,40,20,0.4)] md:hidden"
        >
          <div className="flex flex-col gap-1">
            {LINKS.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {label}
              </a>
            ))}
            <ButtonPrimary href="/contact-sales" className="w-full">
              Contact sales
            </ButtonPrimary>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
