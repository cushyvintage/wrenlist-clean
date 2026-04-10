// Auth pages (register, login, verify-email, forgot-password, reset-password)
// each manage their own full-page layout. This is a pass-through so the outer
// wrapper doesn't clip split-screen designs to a narrow column.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
