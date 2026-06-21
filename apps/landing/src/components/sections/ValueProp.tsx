import { useRef } from 'react';
import { cubicBezier, motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';

const TEXT =
  'Your restaurant runs across a dozen disconnected tools. Feedu turns it into one living system your whole team can run.';

const LIGHT = 'hsl(36 18% 80%)';
const DARK = 'hsl(30 12% 9%)';
const EASE = cubicBezier(0.16,1,0.3,1);

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  // Eased colour + soft opacity lift so each word resolves smoothly, not abruptly.
  const color = useTransform(progress, range, [LIGHT, DARK], { ease: EASE });
  const opacity = useTransform(progress, range, [0.55, 1], { ease: EASE });
  return (
    <motion.span style={{ color, opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

export function ValueProp() {
  const ref = useRef<HTMLDivElement>(null);
  // Pin the statement while it scrolls; words darken across the pin.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // Spring-smooth the raw scroll so the darkening glides instead of tracking jitter 1:1.
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });
  const words = TEXT.split(' ');

  const total = words.length;
  return (
    // Track height = how much scroll is "spent" pinned while the text darkens before the
    // page continues. Long enough that scroll visibly stops and every word resolves,
    // then the section releases and the next section scrolls up underneath.
    <section ref={ref} className="relative h-[250vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center px-5 sm:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mx-auto mb-8 flex select-none items-center justify-center text-2xl font-black italic leading-none tracking-tight sm:text-3xl">
            feedu
          </span>
          <h2 className="font-serif flex flex-wrap justify-center text-3xl font-normal leading-[1.22] tracking-normal sm:text-5xl md:text-[3.3rem]">
            {words.map((w, i) => (
              // Spread the darkening across the whole pin (overlap for smoothness) so it
              // finishes just as the section releases — no empty space afterwards.
              <Word key={i} progress={progress} range={[(i / total) * 0.9, ((i + 2) / total) * 0.9]}>
                {w}
              </Word>
            ))}
          </h2>
        </div>
      </div>
    </section>
  );
}
