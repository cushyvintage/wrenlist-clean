function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] || fallback
}

// Only validate on server side
export const config = {
  supabase: {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  },
  ebay: {
    clientId: optionalEnv("EBAY_CLIENT_ID"),
    clientSecret: optionalEnv("EBAY_CLIENT_SECRET"),
    runame: optionalEnv("EBAY_RUNAME"),
    environment: optionalEnv("EBAY_ENVIRONMENT", "production") as "sandbox" | "production",
  },
  sentry: {
    dsn: optionalEnv("SENTRY_DSN"),
  },
  stripe: {
    secretKey: optionalEnv("STRIPE_SECRET_KEY"),
  },
} as const
