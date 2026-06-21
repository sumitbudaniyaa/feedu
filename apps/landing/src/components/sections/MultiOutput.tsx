import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Section, SectionHeading } from '../primitives.js';
import { fadeUp, inView, stagger } from '../../lib/anim.js';

// admin/kitchen are landscape screenshots; customer/waiter are phone (portrait)
// screenshots. They can't share one box without one shrinking, so each pair is
// kept uniform: landscape shots render full-width at natural size, and both phone
// shots use the same fixed-height phone frame.
const PHONE_H = 'h-[440px]';

/** Landscape app screenshot — shown in full, capped smaller and centered (admin / kitchen match). */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="shadow-product mx-auto w-full max-w-3xl overflow-hidden rounded-2xl ring-1 ring-black/5">
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </div>
  );
}

/** Phone screenshot in a phone frame — fixed height (customer / waiter match). */
function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className={`shadow-product ${PHONE_H} overflow-hidden rounded-[2.2rem] border-[6px] border-[#111] bg-[#111]`}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-auto rounded-[1.7rem]" />
    </div>
  );
}

function Block({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
        <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-6 flex flex-1 items-center justify-center rounded-3xl bg-dots p-6">{children}</div>
    </motion.div>
  );
}

export function MultiOutput() {
  return (
    <Section id="product">
      <SectionHeading title={<>One scan. <br className="hidden sm:block" />Every app in sync.</>} />

      <motion.div variants={stagger} {...inView} className="mt-16 flex flex-col gap-10">
        {/* Top — admin (full width) */}
        <Block title="Owner dashboard" desc="Live revenue, seat occupancy and analytics across branches">
          <Shot src="/mockups/admin.png" alt="Feedu owner dashboard" />
        </Block>

        {/* Middle — customer + waiter (two columns) */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Block title="Customer app" desc="QR ordering, rewards and payments — from any phone">
            <Phone src="/mockups/userapp.png" alt="Feedu customer app" />
          </Block>
          <Block title="Waiter floor" desc="Live table calls the whole floor can see">
            <Phone src="/mockups/waiter.png" alt="Feedu waiter floor" />
          </Block>
        </div>

        {/* Bottom — kitchen (full width) */}
        <Block title="Kitchen display" desc="Orders, timers and prep status, instantly">
          <Shot src="/mockups/kitchen.png" alt="Feedu kitchen display" />
        </Block>
      </motion.div>
    </Section>
  );
}
