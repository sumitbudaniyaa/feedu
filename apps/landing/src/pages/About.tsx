import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Building2, Mail, Store, Users } from 'lucide-react';
import { fadeUp, inView, stagger } from '../lib/anim.js';

const CONTACT_EMAIL = 'sumit.k.budaniya@gmail.com';
const INSTAGRAM = 'https://www.instagram.com/orderwithfeedu/';
const COMPANY_SITE = 'https://twentyeleven.in';

const DETAILS = [
  { icon: Store, title: 'The product', body: 'Feedu is the operating system for modern restaurants — ordering, kitchen, staff, payments and analytics in one live platform.' },
  { icon: Users, title: 'Who it’s for', body: 'Cafés, fine dining, bars, pizzerias, food trucks, bakeries and multi-branch chains — restaurants of every size.' },
  { icon: BarChart3, title: 'What we believe', body: 'Running a restaurant shouldn’t mean juggling a dozen disconnected tools. One connected system lets your team focus on guests.' },
];

export function About() {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-black italic tracking-tight">feedu</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-6 sm:px-8">
        <motion.div variants={stagger} {...inView} className="max-w-2xl">
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> About us
          </motion.span>
          <motion.h1 variants={fadeUp} className="font-display mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            One team, one mission — help restaurants run better.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Feedu started with a simple idea: running a restaurant shouldn’t mean juggling a dozen
            disconnected tools. So we built one platform that ties ordering, kitchen, staff, payments
            and analytics together — live, in real time. One scan does the rest.
          </motion.p>
        </motion.div>

        <motion.div variants={stagger} {...inView} className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DETAILS.map((d) => (
            <motion.div key={d.title} variants={fadeUp} className="rounded-3xl border border-border bg-secondary/40 p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground">
                <d.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display mt-6 text-lg font-bold tracking-tight">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 rounded-3xl border border-border bg-secondary/40 p-7 sm:p-9">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">A product of TwentyEleven</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Feedu is built and backed by{' '}
                <a href={COMPANY_SITE} target="_blank" rel="noreferrer" className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-accent">
                  TwentyEleven
                </a>
                , whose mission is to help restaurants of every size run smoother every shift.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
          <Mail className="mr-1 inline-block h-4 w-4 align-text-bottom" />
          Get in touch — email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline underline-offset-2">{CONTACT_EMAIL}</a>{' '}
          or message us on{' '}
          <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">Instagram</a>.
        </div>
      </main>
    </div>
  );
}
