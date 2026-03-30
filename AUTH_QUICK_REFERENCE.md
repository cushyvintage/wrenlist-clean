# Authentication Quick Reference

## Complete File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx (unchanged - wrapper)
│   │   ├── login/page.tsx (UPDATED - email validation + forgot password link)
│   │   ├── register/page.tsx (UPDATED - full validation + redirect to verify-email)
│   │   ├── forgot-password/page.tsx (UPDATED - wired to Supabase resetPassword)
│   │   ├── reset-password/page.tsx (NEW - password change form with success state)
│   │   └── verify-email/page.tsx (UPDATED - shows user email + resend button)
│   ├── app/
│   │   └── layout.tsx (UPDATED - added user menu + logout)
│   └── layout.tsx (UPDATED - added AuthProvider)
├── contexts/
│   └── AuthContext.tsx (NEW - global auth state with Supabase listener)
├── middleware.ts (NEW - route protection)
├── services/
│   ├── supabase.ts (UPDATED - added resetPassword, updatePassword, resendVerificationEmail)
│   └── auth.service.ts (UPDATED - added error parsing + password reset functions)
└── hooks/
    └── useAuth.ts (UPDATED - uses AuthContext instead of local state)
```

## Key Functions

### Supabase Auth Functions
```typescript
// src/services/supabase.ts
signUp(email, password)              // Register user
signIn(email, password)              // Login user
signOut()                            // Logout
resetPassword(email)                 // Send password reset email
updatePassword(newPassword)          // Update password after reset
resendVerificationEmail(email)       // Resend verification email
getAuthUser()                        // Get current authenticated user
```

### Auth Service Functions
```typescript
// src/services/auth.service.ts
registerUser(email, password)        // Register with error handling
loginUser(email, password)           // Login with error handling
logoutUser()                         // Logout
getCurrentUser()                     // Get current user
sendPasswordResetEmail(email)        // Request password reset
updateUserPassword(newPassword)      // Update password
resendVerificationEmail(email)       // Resend verification
parseAuthError(error)                // Convert Supabase errors to user-friendly messages
```

### React Hooks
```typescript
// src/hooks/useAuth.ts
const { user, isLoading, error, register, login, logout } = useAuth()

// src/contexts/AuthContext.tsx
const { user, isLoading, error } = useAuthContext()
```

## Page Routes

### Public Routes (no auth required)
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset (callback from email)
- `/verify-email` - Email verification
- `/` - Landing page
- `/landing`, `/pricing`, `/about`, `/blog`, `/story`, `/roadmap` - Marketing pages

### Protected Routes (auth required)
- `/app/dashboard` - Dashboard
- `/app/inventory` - Inventory management
- `/app/listings` - Listings
- `/app/analytics` - Analytics
- All routes under `/app/*`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## User Authentication Flow

```
User Signup
├── Visit /register
├── Enter email, password, full name
├── Agree to terms
├── POST to registerUser()
├── Redirect to /verify-email
└── User clicks email link to verify

After Verification
├── User can login at /login
├── POST to loginUser()
├── Redirected to /app/dashboard
└── AuthContext updates with user object

User Menu
├── Visible in /app/* pages
├── Shows user email
├── Logout option
└── Settings link

Password Reset
├── Visit /login → click "Forgot?"
├── Enter email at /forgot-password
├── POST to sendPasswordResetEmail()
├── User receives email with reset link
├── Click link → /auth/reset-password callback
├── Enter new password
├── POST to updateUserPassword()
└── Redirected to /login after success
```

## Error Handling

The system provides friendly error messages for:
- **"Invalid email or password"** - Login with wrong credentials
- **"Please verify your email before logging in"** - Login with unverified email
- **"An account with this email already exists"** - Register with duplicate email
- **"Password must be at least 6 characters"** - Password too weak
- **"Network error. Please check your connection"** - Network issues
- Generic fallback for unexpected errors

## Validation

### Registration
- Full name: 2+ characters, required
- Email: Valid email format, required
- Password: 8+ characters, required
- Confirm password: Must match, required
- Terms: Must be checked, required

### Login
- Email: Valid email format, required
- Password: Non-empty, required

### Password Reset
- Email: Valid email format, required
- New password: 8+ characters, required
- Confirm password: Must match, required

## Security Notes

1. All passwords transmitted to Supabase over HTTPS
2. JWT tokens stored in browser (handled by Supabase SDK)
3. Middleware validates session on each request
4. Email verification required before account is "confirmed"
5. Password reset links expire after 30 minutes
6. Session automatically clears on logout
7. No sensitive data logged to console

## Testing the Auth System

### Quick Test
```bash
npm run dev
# Visit http://localhost:3000/register
# Create account with test@example.com / Test1234!
# Check email verification (in Supabase dashboard)
# Visit /login and login
# Check user menu appears in /app/dashboard
```

### With Real Email
Configure in Supabase dashboard:
1. Authentication → Providers → Email
2. Set password reset URL: `{YOUR_URL}/auth/reset-password`
3. Enable email confirmations
4. Configure email templates

## Common Issues & Solutions

**Issue: User can't login after registering**
- Check if email is verified in Supabase dashboard
- Resend verification email from /verify-email page

**Issue: Password reset link not working**
- Check password reset URL configured in Supabase: `{YOUR_URL}/auth/reset-password`
- Ensure redirect URL matches your deployment URL

**Issue: Middleware redirecting when shouldn't**
- Check public routes list in middleware.ts
- Add new public routes to the routes array

**Issue: User session not persisting**
- Clear browser localStorage
- Check Supabase project URL and anon key are correct
- Verify AuthProvider wrapping all routes in root layout

## Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Email provider configured (SendGrid, Postmark, etc.)
- [ ] Password reset URL set in Supabase
- [ ] Email confirmation enabled
- [ ] Environment variables set in deployment platform
- [ ] CORS configured for your domain
- [ ] Test registration and password reset flows
- [ ] Monitor auth errors in production
