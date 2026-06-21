import { motion } from 'framer-motion';
import { Building2, GitBranch, LayoutDashboard, Share2, Trophy } from 'lucide-react';
import { Section, SectionHeading } from '../primitives';
import { MiniDashboard } from '../mockups';
import { blurReveal, fadeUp, inView, stagger } from '../../lib/anim';

const PERKS = [
  { icon: LayoutDashboard, label: 'Centralized reporting' },
  { icon: Trophy, label: 'Branch comparison' },
  { icon: Share2, label: 'Shared menus' },
  { icon: GitBranch, label: 'Shared loyalty' },
  { icon: Building2, label: 'Unified management' },
];

const BRANCHES = ['Branch A · Bandra', 'Branch B · Andheri', 'Branch C · Powai', 'Branch D · Thane'];

export function MultiBranch() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Multi-branch management"
        title={<>Scale from one location to <span className="text-accent">hundreds.</span></>}
        description="A brand is the tenant; each branch runs independently while rolling up into one combined view and one subscription."
      />

      <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <motion.div variants={stagger} {...inView} className="relative">
          <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-semibold">Your Brand</p>
              <p className="text-xs text-muted-foreground">One combined plan · shared catalog</p>
            </div>
          </motion.div>

          <div className="ml-6 flex flex-col gap-3 border-l border-dashed border-border pl-6">
            {BRANCHES.map((b) => (
              <motion.div key={b} variants={fadeUp} className="card-warm relative flex items-center gap-3 rounded-xl p-3.5">
                <span aria-hidden className="absolute -left-6 top-1/2 h-px w-6 bg-border" />
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground/70">
                  <GitBranch className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{b}</span>
                <span className="ml-auto text-xs font-medium text-accent">live</span>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PERKS.map((p) => (
              <div key={p.label} className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2.5">
                <p.icon className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-xs font-medium">{p.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div variants={blurReveal} {...inView} className="relative flex justify-center rounded-3xl border border-border bg-dots p-6">
          <div className="w-full max-w-md">
            <MiniDashboard variant="owner" />
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
