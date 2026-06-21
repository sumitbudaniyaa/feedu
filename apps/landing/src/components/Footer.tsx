import { Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

const INSTAGRAM = 'https://www.instagram.com/orderwithfeedu/';

export function Footer() {
  return (
    <footer className="relative px-4 pb-8 sm:px-6">
      {/* paperclip clipped onto the top edge of the footer */}
      <img
        src="/clip.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-10 w-16 -translate-x-1/2 -translate-y-1/2 select-none drop-shadow-lg sm:w-20"
      />
      <div className="grain relative overflow-hidden rounded-[2.5rem] tint-green px-6 py-14 sm:px-12">
        <div className="relative mx-auto max-w-6xl text-center">
          <span className="text-2xl font-black italic tracking-tight">feedu</span>
          <p className="font-display mx-auto mt-4 max-w-xs text-xl font-thin leading-tight tracking-tight">
            here to help you feed
          </p>
        </div>

        <div className="relative mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-black/10 pt-6 text-xs text-foreground/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Feedu. All rights reserved.</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-4 sm:mt-0 sm:flex sm:w-auto sm:items-center sm:gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link to="/about" className="transition-colors hover:text-foreground">About us</Link>
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noreferrer"
                aria-label="Feedu on Instagram"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 text-right sm:text-left">
              <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="transition-colors hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </div>

        <p className="relative mx-auto mt-6 max-w-6xl text-center text-xs text-foreground/55">
          A product of{' '}
          <a href="https://twentyeleven.in" target="_blank" rel="noreferrer" className="font-semibold text-foreground/80 transition-colors hover:text-foreground">
            <span style={{ fontFamily: '"Pacifico", cursive' }} className="text-[1.2em]">twenty</span>
            <span style={{ fontFamily: '"Nunito", sans-serif' }} className="text-[1em] font-extrabold tracking-tight">eleven</span>
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
