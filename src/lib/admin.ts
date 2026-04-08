/** Admin access control */

export const ADMIN_EMAILS = [
  'dom@wrenlist.com',
  'dominiccushnan@gmail.com',
  'domcushnan@gmail.com',
]

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
