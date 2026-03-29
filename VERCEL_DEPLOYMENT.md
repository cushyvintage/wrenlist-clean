# Vercel Deployment Setup

## Quick Start

Deploy wrenlist-clean to Vercel + connect wrenlist.com domain in **5 minutes**.

---

## Step 1: Create Supabase Project

1. Go to: https://supabase.com/dashboard
2. Click **"New project"**
3. Fill in:
   - Organization: (select your org)
   - Project name: `wrenlist-clean`
   - Database password: (generate strong, save it)
   - Region: **EU-West-1** (London, best for UK)
4. Click **"Create new project"**
5. Wait 2-3 minutes for initialization

---

## Step 2: Get Supabase Credentials

1. Project created → Click on it
2. Go to: **Settings** → **API**
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

**Save these** — you'll need them for Vercel in 30 seconds.

---

## Step 3: Create Vercel Project

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Search for: **`wrenlist-clean`**
4. Select: `cushyvintage/wrenlist-clean`
5. Click **"Import"**

---

## Step 4: Configure Environment Variables

On the Vercel import page, you'll see "Environment Variables" section:

**Add these two variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Paste from Supabase (Project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Paste from Supabase (Anon key) |

Click **"Deploy"** ✅

Vercel will build and deploy automatically. Wait 2-3 minutes.

---

## Step 5: Add wrenlist.com Domain

Once deployment completes:

1. In Vercel dashboard, click on the **wrenlist-clean** project
2. Go to: **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter: `wrenlist.com`
5. Click **"Add"**

Vercel will show you DNS records to add:

```
Type: CNAME
Name: (blank or @)
Value: cname.vercel.sh
```

**Update DNS Records**:
- Go to your domain registrar (GoDaddy, Namecheap, etc.)
- Add/update CNAME record with Vercel's value
- DNS can take 5-30 minutes to propagate

---

## Step 6: Verify Deployment

1. Wait 5-10 minutes for DNS to propagate
2. Visit: https://wrenlist.com
3. You should see the **Wrenlist login page** ✅

---

## What Happens on `git push`

Now that Vercel is connected:

1. You push code to `origin main`
2. GitHub triggers Vercel build
3. Vercel runs `npm run build`
4. Deploys to **https://wrenlist.com** automatically

**No manual deployment needed!**

---

## Troubleshooting

### "Domain not connecting"
- DNS can take 30 minutes to propagate
- Check DNS propagation: https://dnschecker.org (enter wrenlist.com)
- Try incognito/different browser (clear cache)

### "Build failing on Vercel"
- Check Vercel **Deployments** tab for error logs
- Common: Missing environment variables
  - Verify both variables added in Vercel settings
  - Redeploy manually (Vercel dashboard → Deployments → Redeploy)

### "Supabase connection error"
- Verify credentials are correct (copy-paste again)
- Check Supabase project is initialized (wait 5 min if new)
- Try local dev first: `npm run dev` with `.env.local`

---

## Environment Variables Reference

**For local development** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**For Vercel** (Settings → Environment Variables):
- Same two variables
- They auto-inject into build + runtime

---

## Staging vs Production

**During Phase 1 development**:
- **Production**: wrenlist.com (current, live code)
- **Preview**: Auto-created per PR (Vercel generates preview URL)
- **Local**: `npm run dev` on your machine

**Workflow**:
1. Create feature branch: `git checkout -b feat/auth`
2. Build locally: `npm run dev`
3. Push to GitHub: `git push origin feat/auth`
4. Vercel creates preview deployment (link in PR)
5. Review preview before merge
6. Merge to main → Auto-deploys to wrenlist.com

---

## Monitoring

**Check deployment status**:
- Vercel dashboard: https://vercel.com/dashboard
- Click wrenlist-clean → Deployments tab
- Green checkmark = live
- Orange circle = building
- Red X = failed

**View logs**:
- Click on deployment
- See build logs + runtime logs
- Useful for debugging issues

---

## After Deployment

Now that wrenlist.com is live:

1. ✅ Follow `INTERNAL_ROADMAP.md` for Phase 1 tasks
2. ✅ Build components locally
3. ✅ Test in browser at https://wrenlist.com
4. ✅ Every `git push` → auto-deploys
5. ✅ No Vercel configuration needed

**Start with**: Create Supabase schema + Auth system (Epic 1.1)

---

## Key Dates

- **Now**: Supabase + Vercel + Domain connected
- **Week 1**: Auth + Dashboard + Inventory live on wrenlist.com
- **Week 2**: Listings + Settings + Testing
- **Week 3+**: Phase 2 onwards

---

## Questions?

If deployment gets stuck:
1. Check Vercel build logs
2. Check Supabase project status
3. Try redeploying manually in Vercel dashboard
4. Ask in #wrenlist Slack channel

**You're live!** 🎉 Start building Phase 1.
