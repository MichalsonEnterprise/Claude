type Level = 'debug' | 'info' | 'warn' | 'error';

// Keys that must never reach stdout even if they end up in a logged object.
const SECRET_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization)/i;

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_PATTERN.test(k) ? '[REDACTED]' : redact(v);
    }
    return out;
  }
  return value;
}

function log(level: Level, message: string, data?: unknown) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined ? { data: redact(data) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, data?: unknown) => log('debug', message, data),
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};
