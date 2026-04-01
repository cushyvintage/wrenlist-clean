import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN

// Only initialize if DSN is provided
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of traces in production
  })
}
