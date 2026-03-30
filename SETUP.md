# Wrenlist Clean - Setup Guide

## Project Status
✅ Fresh Supabase project created and configured
✅ Database schema deployed
✅ .env.local configured with new credentials
✅ Local development server running

## Supabase Project Details
- **Project Name**: wrenlist-clean
- **Project ID**: `tewtfroudyicwfubgcqi`
- **Database Region**: AWS EU-West-1 (Ireland)
- **Project URL**: https://tewtfroudyicwfubgcqi.supabase.co

## Environment Configuration
The `.env.local` file has been updated with the new Supabase project credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://tewtfroudyicwfubgcqi.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_QBJb76j4SB1G2muS_V5rlw_r7bFpXl_"
```

## Database Schema
The following tables have been created and are accessible:
- **profiles** - User profile information (plan, location, etc.)
- **products** - Inventory/finds (vintage items)
- **listings** - Cross-marketplace listing tracking (Vinted, eBay, Etsy, Shopify)
- **expenses** - Business expense tracking (packaging, postage, platform fees, etc.)
- **mileage** - HMRC-compliant mileage tracking (45p/mile deduction)

Plus system tables:
- **daily_metrics** - Daily aggregated metrics
- **monthly_metrics** - Monthly aggregated metrics

## Row-Level Security (RLS)
All tables have RLS policies enabled to ensure users can only access their own data.

## Local Development

### Start the development server
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or next available port if 3000 is in use).

### Test the authentication flow
1. Navigate to `http://localhost:3000/register`
2. Create a test account with any email (e.g., test@example.com)
3. You'll receive a verification email (configure email provider in Supabase → Authentication)
4. Click the verification link
5. You'll be redirected to the dashboard

### Test database operations
1. After authentication, navigate to `/app/dashboard`
2. Create a new "find" (inventory item) via `/app/add-find`
3. View inventory in `/app/inventory`
4. Log expenses and mileage via their respective forms
5. Check analytics in `/app/analytics`

All data is automatically saved to the Supabase database.

## Configuration Checklist

### Authentication
- [ ] Configure email provider in Supabase
  - Go to: Project Settings → Authentication → Email
  - Set up Resend or SendGrid for email delivery
  - Configure reply-to address

### API Keys
- [ ] Review publishable key used in `.env.local`
- [ ] Store service role key securely (never commit to git)
- [ ] Rotate keys if needed

### Database
- [ ] Verify RLS policies are active (currently enforced)
- [ ] Check indexes for performance (already optimized)
- [ ] Monitor database size and performance

## File Structure
```
/migrations/
  001_create_core_tables.sql      # Profiles, Products, Listings
  002_create_operations_tables.sql # Expenses, Mileage
  003_enable_rls.sql              # Row-Level Security policies
  004_seed_data.sql               # Optional seed data

/src/
  /app/
    /app/                         # Protected routes
      /dashboard                  # Dashboard
      /add-find                   # Add new inventory
      /inventory                  # View inventory
      /listings                   # Manage listings
      /analytics                  # Analytics
    /(auth)/
      /register                   # Sign up
      /login                      # Sign in

  /components/                    # Reusable React components
  /lib/                           # Utilities
  /styles/                        # Global styles
```

## Troubleshooting

### Port already in use
The dev server will automatically use the next available port (3003, 3004, etc.)

### Supabase connection errors
1. Verify `.env.local` has correct URL and key
2. Check Supabase project is "Active" in dashboard
3. Verify firewall/network allows outbound connections to Supabase

### Authentication not working
1. Ensure email provider is configured in Supabase
2. Check email settings in Supabase → Authentication
3. Verify callback URL is set correctly

### Database tables not appearing
The schema has already been deployed. If issues occur:
1. Check Supabase SQL Editor for any errors
2. Verify RLS policies are not blocking queries
3. Check user authentication context

## Next Steps
1. Configure email provider for authentication
2. Test the complete authentication flow
3. Verify all form submissions save to database
4. Test cross-marketplace listing sync (when APIs are configured)
5. Deploy to Vercel when ready for production

## Support
For issues or questions:
- Check Supabase dashboard for error logs
- Review browser console for client-side errors
- Check Next.js dev server terminal for server-side errors
