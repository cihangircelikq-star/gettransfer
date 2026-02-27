type LogLevel = 'info' | 'warn' | 'error'

function base(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const payload = { level, msg, time: new Date().toISOString(), ...(meta || {}) }
  if (level === 'error') console.error(payload)
  else if (level === 'warn') console.warn(payload)
  else console.log(payload)
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => base('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => base('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => base('error', msg, meta),
}

export function logRequestStart(method: string, url: string, requestId?: string) {
  logger.info('request_start', { method, url, requestId })
}

export function logRequestEnd(status: number, ms: number, requestId?: string) {
  logger.info('request_end', { status, duration_ms: ms, requestId })
}

