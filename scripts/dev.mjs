#!/usr/bin/env node
/**
 * Feedo dev launcher.
 *
 * Interactive arrow-key menu (run `npm run dev`) or direct mode
 * (`npm run dev -- admin`). Every option includes the backend, since the
 * apps need the API.
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const BACKEND = '@feedo/backend';

/** key → { label, apps (workspace names, excluding backend), ports } */
const TARGETS = {
  all: { label: 'Run all apps', apps: ['admin', 'customer', 'kitchen', 'company'] },
  admin: { label: 'Run admin + backend', apps: ['@feedo/admin-app'], ports: '5173' },
  user: { label: 'Run user (customer) + backend', apps: ['@feedo/customer-app'], ports: '5174' },
  kitchen: { label: 'Run kitchen + backend', apps: ['@feedo/kitchen-app'], ports: '5175' },
  company: {
    label: 'Run company (super admin) + backend',
    apps: ['@feedo/super-admin-app'],
    ports: '5176',
  },
  // Marketing site — static, no backend needed.
  landing: { label: 'Run landing site', apps: ['@feedo/landing'], ports: '5177', noBackend: true },
};

const MENU = ['all', 'admin', 'user', 'kitchen', 'company', 'landing'];

// Aliases so direct mode is forgiving.
const ALIAS = {
  all: 'all',
  everything: 'all',
  admin: 'admin',
  owner: 'admin',
  user: 'user',
  customer: 'user',
  kitchen: 'kitchen',
  kds: 'kitchen',
  company: 'company',
  super: 'company',
  'super-admin': 'company',
  platform: 'company',
  landing: 'landing',
  site: 'landing',
  marketing: 'landing',
};

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  accent: (s) => `\x1b[38;5;141m${s}\x1b[0m`,
};

function filtersFor(targetKey) {
  if (targetKey === 'all') return []; // no filter = whole workspace (incl. backend)
  const target = TARGETS[targetKey];
  const appFilters = target.apps.flatMap((a) => ['--filter', a]);
  return target.noBackend ? appFilters : [...appFilters, '--filter', BACKEND];
}

function launch(targetKey) {
  const target = TARGETS[targetKey];
  const args = ['turbo', 'run', 'dev', ...filtersFor(targetKey)];

  console.log('');
  console.log(c.accent('  ▸ ') + c.bold(target.label));
  if (!target.noBackend) console.log(c.dim('    backend → http://localhost:4000'));
  if (target.ports) console.log(c.dim(`    app     → http://localhost:${target.ports}`));
  if (targetKey === 'all') {
    console.log(c.dim('    admin :5173 · customer :5174 · kitchen :5175 · company :5176'));
  }
  console.log(c.dim(`    $ npx ${args.join(' ')}`));
  console.log('');

  const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => process.exit(code ?? 0));
}

const HEADER_LINES = 3; // blank + title + blank
const FOOTER_LINES = 2; // blank + hint

function renderMenu(selected, firstPaint) {
  const totalLines = HEADER_LINES + MENU.length + FOOTER_LINES;
  if (!firstPaint) process.stdout.write(`\x1b[${totalLines}A`); // cursor up to top of menu

  const lines = [
    '',
    `  ${c.bold('Feedo')}${c.dim('  — what do you want to run?')}`,
    '',
    ...MENU.map((key, i) => {
      const label = TARGETS[key].label;
      return i === selected
        ? `${c.accent('  ❯ ')}${c.bold(label)}`
        : `    ${c.dim(label)}`;
    }),
    '',
    c.dim('  ↑/↓ to move · enter to run · q to quit'),
  ];
  // \x1b[K clears each line to the right so stale text never lingers.
  process.stdout.write(lines.map((l) => `${l}\x1b[K`).join('\n') + '\n');
}

function arrowMenu() {
  let selected = 0;
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write('\x1b[?25l'); // hide cursor

  const cleanup = () => {
    process.stdout.write('\x1b[?25h'); // show cursor
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeListener('keypress', onKey);
  };

  function onKey(_str, key) {
    if (!key) return;
    if (key.name === 'up' || key.name === 'k') {
      selected = (selected - 1 + MENU.length) % MENU.length;
      renderMenu(selected, false);
    } else if (key.name === 'down' || key.name === 'j') {
      selected = (selected + 1) % MENU.length;
      renderMenu(selected, false);
    } else if (key.name === 'return' || key.name === 'enter') {
      cleanup();
      launch(MENU[selected]);
    } else if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      cleanup();
      console.log(c.dim('\n  Cancelled.'));
      process.exit(0);
    }
  }

  process.stdin.on('keypress', onKey);
  renderMenu(selected, true);
}

/** Fallback for non-interactive stdin (piped input, CI): read a number. */
function numberMenu() {
  console.log('');
  console.log(`  ${c.bold('Feedo')}${c.dim('  — what do you want to run?')}`);
  console.log('');
  MENU.forEach((key, i) => console.log(`  ${c.accent(String(i + 1))}  ${TARGETS[key].label}`));
  console.log('');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(c.dim(`  Choose [1-${MENU.length}] (default 1): `), (answer) => {
    rl.close();
    const trimmed = answer.trim();
    const idx = trimmed === '' ? 0 : Number(trimmed) - 1;
    if (!MENU[idx]) {
      console.log(c.dim('  Invalid choice.'));
      process.exit(1);
    }
    launch(MENU[idx]);
  });
}

// Direct mode: `npm run dev -- admin`
const arg = process.argv[2]?.toLowerCase();
if (arg) {
  const target = ALIAS[arg];
  if (!target) {
    console.log(`Unknown target "${arg}". Try: ${Object.keys(TARGETS).join(', ')}`);
    process.exit(1);
  }
  launch(target);
} else if (process.stdin.isTTY) {
  arrowMenu();
} else {
  numberMenu();
}
