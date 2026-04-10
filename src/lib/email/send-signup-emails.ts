import { sendEmail } from './client'
import { buildWelcomeEmail } from './templates/welcome'
import { buildAdminNewUserEmail } from './templates/admin-new-user'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'domcushnan@gmail.com'

export interface SignupEmailArgs {
  userId: string
  email: string
  fullName: string | null
  signupMethod: 'email' | 'google' | 'github' | string
}

/**
 * Fire welcome + admin notification emails in parallel.
 *
 * Both sends are independent — if one fails the other still goes through.
 * Never throws: the caller should log the result but continue regardless,
 * since a missed email must never block a user's signup.
 */
export async function sendSignupEmails(
  args: SignupEmailArgs,
): Promise<{
  welcome: { ok: boolean; detail: string }
  admin: { ok: boolean; detail: string }
}> {
  const firstName = args.fullName?.trim().split(/\s+/)[0] || null

  const welcomeTpl = buildWelcomeEmail({ firstName, appUrl: APP_URL })
  const adminTpl = buildAdminNewUserEmail({
    fullName: args.fullName,
    email: args.email,
    signupMethod: args.signupMethod,
    userId: args.userId,
    signedUpAt: new Date(),
  })

  const [welcomeResult, adminResult] = await Promise.all([
    sendEmail({
      to: args.email,
      subject: welcomeTpl.subject,
      html: welcomeTpl.html,
      text: welcomeTpl.text,
      replyTo: 'dom@wrenlist.com',
      tags: [
        { name: 'category', value: 'welcome' },
        { name: 'signup_method', value: args.signupMethod },
      ],
    }),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: adminTpl.subject,
      html: adminTpl.html,
      text: adminTpl.text,
      tags: [{ name: 'category', value: 'admin_notification' }],
    }),
  ])

  return {
    welcome: welcomeResult.ok
      ? { ok: true, detail: welcomeResult.id }
      : { ok: false, detail: welcomeResult.error },
    admin: adminResult.ok
      ? { ok: true, detail: adminResult.id }
      : { ok: false, detail: adminResult.error },
  }
}
