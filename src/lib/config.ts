function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] || fallback
}

// Lazy config: getters prevent build-time crashes when env vars
// are unavailable (e.g. Vercel preview deploys without env config).
// Values are read at call-time, not at import-time.
export const config = {
  supabase: {
    get url() { return requireEnv("NEXT_PUBLIC_SUPABASE_URL") },
    get anonKey() { return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
  },
  ebay: {
    get clientId() { return optionalEnv("EBAY_CLIENT_ID") },
    get clientSecret() { return optionalEnv("EBAY_CLIENT_SECRET") },
    get runame() { return optionalEnv("EBAY_RUNAME") },
    get environment() { return optionalEnv("EBAY_ENVIRONMENT", "production") as "sandbox" | "production" },
  },
  sentry: {
    get dsn() { return optionalEnv("SENTRY_DSN") },
  },
  stripe: {
    get secretKey() { return optionalEnv("STRIPE_SECRET_KEY") },
  },
} as const
