#!/usr/bin/env node
/**
 * Feedo dev launcher.
 *
 * Interactive menu (run `npm run dev`) or direct mode (`npm run dev -- admin`).
 * Every option includes the backend, since the apps need the API.
 */
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const BACKEND = '@feedo/backend';

/** key → { label, filters (workspace names, excluding backend) } */
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
};

const MENU = [
  { key: 'all', target: 'all' },
  { key: 'admin', target: 'admin' },
  { key: 'user', target: 'user' },
  { key: 'kitchen', target: 'kitchen' },
  { key: 'company', target: 'company' },
];

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
};

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  accent: (s) => `\x1b[38;5;141m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
};

function filtersFor(targetKey) {
  const target = TARGETS[targetKey];
  if (targetKey === 'all') {
    // Backend is part of the workspace; running with no filter starts everything.
    return [];
  }
  return [...target.apps.flatMap((a) => ['--filter', a]), '--filter', BACKEND];
}

function launch(targetKey) {
  const target = TARGETS[targetKey];
  const filters = filtersFor(targetKey);
  const args = ['turbo', 'run', 'dev', ...filters];

  console.log('');
  console.log(c.accent('  ▸ ') + c.bold(target.label));
  console.log(c.dim(`    backend → http://localhost:4000`));
  if (target.ports) console.log(c.dim(`    app     → http://localhost:${target.ports}`));
  if (targetKey === 'all') {
    console.log(c.dim('    admin :5173 · customer :5174 · kitchen :5175 · company :5176'));
  }
  console.log(c.dim(`    $ npx ${args.join(' ')}`));
  console.log('');

  const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => process.exit(code ?? 0));
}

function showMenuAndPrompt() {
  console.log('');
  console.log(c.bold('  Feedo') + c.dim('  — what do you want to run?'));
  console.log('');
  MENU.forEach((m, i) => {
    console.log(`  ${c.accent(String(i + 1))}  ${TARGETS[m.target].label}`);
  });
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(c.dim('  Choose [1-' + MENU.length + '] (default 1): '), (answer) => {
    rl.close();
    const trimmed = answer.trim();
    const idx = trimmed === '' ? 0 : Number(trimmed) - 1;
    const choice = MENU[idx];
    if (!choice) {
      console.log(c.dim('  Invalid choice.'));
      process.exit(1);
    }
    launch(choice.target);
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
} else {
  showMenuAndPrompt();
}
