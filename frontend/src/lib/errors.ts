import { isAxiosError } from 'axios'

/** What the backend's AllExceptionsFilter puts into an error response. */
interface ApiErrorBody {
  statusCode?: number
  error?: string
  message?: string | string[]
  code?: string
  prismaCode?: string
  requestId?: string
}

/**
 * One line that says what went wrong, for toasts and inline errors.
 *
 * The tool is internal, so this is deliberately verbose: status, backend error
 * type, message, Prisma code and Railway request id — enough to find the log
 * line. `prefix` is the human part ("Import fehlgeschlagen").
 */
export function describeError(err: unknown, prefix?: string): string {
  let detail: string
  if (isAxiosError<ApiErrorBody>(err)) {
    const body = err.response?.data
    const status = err.response?.status
    if (!err.response) {
      detail = `Keine Antwort vom Server (${err.code ?? 'Netzwerkfehler'}: ${err.message})`
    } else {
      const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
      detail = [
        `HTTP ${status}`,
        body?.error && body.error !== message ? body.error : null,
        body?.prismaCode ? `[${body.prismaCode}]` : null,
        body?.code ? `[${body.code}]` : null,
      ]
        .filter(Boolean)
        .join(' ')
      if (message) detail += ` — ${message}`
      if (body?.requestId) detail += ` (req ${body.requestId})`
    }
  } else if (err instanceof Error) {
    detail = `${err.name}: ${err.message}`
  } else {
    detail = String(err)
  }
  return prefix ? `${prefix}: ${detail}` : detail
}

/** Full error, including the backend stack, for the console. */
export function logError(context: string, err: unknown): void {
  console.error(`[${context}]`, describeError(err), isAxiosError(err) ? err.response?.data : err)
}
