export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  corsOrigins: string[]
}

function parseCorsOrigins(input: string | undefined): string[] {
  return (input || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const config: AppConfig = {
  nodeEnv: (process.env.NODE_ENV === 'production' ? 'production' : (process.env.NODE_ENV === 'test' ? 'test' : 'development')),
  port: Number(process.env.PORT || 3005),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}

export function isProd() {
  return config.nodeEnv === 'production'
}

export function requireEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`Eksik ortam değişkenleri: ${missing.join(', ')}`)
  }
}
