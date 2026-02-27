import { ENV } from '@/config/env'
import { useAuthStore } from '@/stores/authStore'

type HttpOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 15000

export async function fetchJson<T>(
  path: string,
  options: HttpOptions = {},
): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT)
  try {
    const token = useAuthStore.getState().token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    const res = await fetch(`${ENV.apiUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    if (!res.ok) {
      const detail = isJson ? await res.json().catch(() => ({})) : {}
      const err = new Error(`HTTP ${res.status}`)
      ;(err as any).detail = detail
      throw err
    }
    return (isJson ? await res.json() : (await res.text())) as T
  } finally {
    clearTimeout(t)
  }
}
