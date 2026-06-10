/* Tiny structured logger — swap for pino/winston when needed. */
const ts = () => new Date().toISOString();

export const logger = {
  info: (msg: string, ...args: unknown[]) => console.log(`[${ts()}] ℹ️  ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[${ts()}] ⚠️  ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[${ts()}] ❌ ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.debug(`[${ts()}] 🐞 ${msg}`, ...args);
  },
};
