import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dsn = process.env.SENTRY_DSN
    if (dsn) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      })
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const dsn = process.env.SENTRY_DSN
    if (dsn) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      })
    }
  }
}

export const onRequestError = Sentry.captureRequestError
