# Nabu Production Deployment Guide

This guide covers deploying Nabu to production using Vercel (hosting), Supabase (PostgreSQL database), and GitHub (version control + CI/CD).

## Architecture Overview

```
┌─────────────────┐     git push      ┌─────────────────┐
│   Local Code    │ ───────────────►  │     GitHub      │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               │ auto deploy
                                               ▼
                                      ┌─────────────────┐
                                      │     Vercel      │
                                      │   (Hosting)     │
                                      └────────┬────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
                ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
                │    Supabase     │   │   Kinde Auth    │   │   Other APIs    │
                │   (Database)    │   │ (Authentication)│   │   (Optional)    │
                └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Part 1: Supabase Setup (Database)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `nabu-production`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users (e.g., `eu-west-2` for UK)
4. Click **"Create new project"** (takes ~2 minutes to provision)

### 1.2 Get Database Connection Strings

1. Go to **Project Settings** (gear icon) → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab

You need **TWO** connection URLs:

#### DATABASE_URL (Pooled - for app runtime)
Use the **Transaction pooler** connection (port 6543):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### MIGRATE_DATABASE_URL (Direct - for migrations)
Use the **Session pooler** or **Direct** connection (port 5432):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

> **Important**: 
> - Pooled connection (6543) = better performance for app queries
> - Direct connection (5432) = required for Prisma migrations
> - Replace `[PASSWORD]` with your database password

### 1.3 Note Your Project Details

Save these for later:
- Project Reference ID (found in URL: `https://supabase.com/dashboard/project/[PROJECT-REF]`)
- Database password
- Both connection URLs

---

## Part 2: GitHub Repository Setup

### 2.1 Initialize Git Repository

If not already a git repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

### 2.2 Create GitHub Repository

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `nabu` (or your preferred name)
3. Keep it **Private** (recommended for proprietary code)
4. Don't initialize with README (you already have code)

### 2.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/nabu.git
git branch -M main
git push -u origin main
```

### 2.4 Verify .gitignore

Ensure these are in your `.gitignore`:
```
# Environment files
.env
.env.local
.env.production
.env*.local

# Dependencies
node_modules/

# Build output
.next/
out/

# Prisma
prisma/*.db
prisma/*.db-journal
```

---

## Part 3: Kinde Auth Setup

### 3.1 Create Kinde Account

1. Go to [kinde.com](https://kinde.com) and sign up
2. Create a new business/organization

### 3.2 Create Application

1. Go to **Applications** → **Add application**
2. Select **"Back-end web"** (Regular Web Application)
3. Name it `Nabu Production`

### 3.3 Configure Callback URLs

In your Kinde application settings, set:

**Allowed callback URLs:**
```
https://your-app.vercel.app/api/auth/kinde_callback
```

**Allowed logout redirect URLs:**
```
https://your-app.vercel.app
```

> Replace `your-app.vercel.app` with your actual Vercel domain after deployment

### 3.4 Get Credentials

From the application details, copy:
- **Client ID**
- **Client Secret**  
- **Issuer URL** (e.g., `https://your-business.kinde.com`)

---

## Part 4: Vercel Setup (Hosting)

### 4.1 Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your **GitHub account**
3. Click **"Add New Project"**
4. Select your `nabu` repository from the list
5. Vercel will auto-detect it as a Next.js project

### 4.2 Configure Environment Variables

Before deploying, add all environment variables in Vercel:

1. In the project setup page, expand **"Environment Variables"**
2. Add each variable:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@...pooler...:6543/postgres?pgbouncer=true` | Supabase pooled URL |
| `MIGRATE_DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@...pooler...:5432/postgres` | Supabase direct URL |
| `NEXTAUTH_SECRET` | (generate below) | Random secret key |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel URL |
| `KINDE_CLIENT_ID` | (from Kinde) | Application client ID |
| `KINDE_CLIENT_SECRET` | (from Kinde) | Application secret |
| `KINDE_ISSUER_URL` | `https://your-business.kinde.com` | Your Kinde domain |
| `KINDE_SITE_URL` | `https://your-app.vercel.app` | Your Vercel URL |
| `KINDE_POST_LOGOUT_REDIRECT_URL` | `https://your-app.vercel.app` | Redirect after logout |
| `KINDE_POST_LOGIN_REDIRECT_URL` | `https://your-app.vercel.app/notes` | Redirect after login |

#### Generate NEXTAUTH_SECRET

Run this in your terminal:
```bash
openssl rand -base64 32
```

Or use: https://generate-secret.vercel.app/32

### 4.3 Configure Build Settings

In Vercel project **Settings** → **General**:

**Build Command:**
```bash
prisma generate && prisma migrate deploy && next build
```

**Output Directory:**
```
.next
```

**Install Command:**
```bash
npm install
```

### 4.4 Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Generate Prisma client
   - Run database migrations
   - Build Next.js app
   - Deploy to global edge network

First deployment takes 3-5 minutes.

---

## Part 5: Post-Deployment Configuration

### 5.1 Update Kinde Callback URLs

After deployment, you'll have a Vercel URL like `https://nabu-abc123.vercel.app`.

Go back to Kinde and update:
- **Allowed callback URLs**: `https://nabu-abc123.vercel.app/api/auth/kinde_callback`
- **Allowed logout URLs**: `https://nabu-abc123.vercel.app`

### 5.2 Update Vercel Environment Variables

Update these with your actual Vercel URL:
- `NEXTAUTH_URL`
- `KINDE_SITE_URL`
- `KINDE_POST_LOGOUT_REDIRECT_URL`
- `KINDE_POST_LOGIN_REDIRECT_URL`

Then **redeploy** (Deployments → three dots → Redeploy)

### 5.3 Seed Database (Optional)

If you need initial data:

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="your-supabase-pooled-url"
npx prisma db seed
```

Or create a seed script in Vercel Functions.

### 5.4 Verify Deployment

1. Visit your Vercel URL
2. Click "Login" and test Kinde authentication
3. Create a test folder and note
4. Check Supabase dashboard → **Table Editor** to verify data

---

## Part 6: Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. Go to project **Settings** → **Domains**
2. Enter your domain (e.g., `app.nabu.io`)
3. Click **Add**

### 6.2 Configure DNS

Vercel will show DNS records to add. Typically:

| Type | Name | Value |
|------|------|-------|
| CNAME | `app` | `cname.vercel-dns.com` |
| A | `@` | `76.76.21.21` |

### 6.3 Update All URLs

After domain is verified, update:

**Vercel Environment Variables:**
- `NEXTAUTH_URL` → `https://app.nabu.io`
- `KINDE_SITE_URL` → `https://app.nabu.io`
- `KINDE_POST_LOGOUT_REDIRECT_URL` → `https://app.nabu.io`
- `KINDE_POST_LOGIN_REDIRECT_URL` → `https://app.nabu.io/notes`

**Kinde Application:**
- Update callback URLs to use new domain

---

## Continuous Deployment

After initial setup, deployment is automatic:

```bash
# Make changes locally
git add .
git commit -m "Add new feature"
git push origin main

# Vercel automatically:
# 1. Detects push
# 2. Builds new version
# 3. Runs migrations
# 4. Deploys with zero downtime
# 5. Keeps previous version as rollback
```

### Preview Deployments

For pull requests, Vercel creates preview URLs:
- Push to a branch
- Open PR
- Vercel deploys to `https://nabu-git-feature-branch.vercel.app`
- Test before merging

---

## Environment-Specific Configuration

### Development (.env.local)
```env
DATABASE_URL="postgresql://localhost:5432/nabu_dev"
NEXTAUTH_URL="http://localhost:3000"
```

### Production (Vercel Environment Variables)
```env
DATABASE_URL="postgresql://...supabase...?pgbouncer=true"
NEXTAUTH_URL="https://your-production-domain.com"
```

---

## Troubleshooting

### Database Connection Fails

**Symptom:** `Can't reach database server`

**Solutions:**
1. Verify `DATABASE_URL` uses port `6543` (pooler)
2. Check password has no special characters that need URL encoding
3. Ensure Supabase project is not paused (free tier pauses after inactivity)

### Migrations Fail

**Symptom:** `Migration failed to apply`

**Solutions:**
1. Verify `MIGRATE_DATABASE_URL` uses port `5432` (direct)
2. Run migrations locally first: `npx prisma migrate deploy`
3. Check for schema conflicts in Supabase dashboard

### Authentication Redirect Errors

**Symptom:** `Callback URL mismatch`

**Solutions:**
1. Ensure Kinde callback URLs exactly match your Vercel domain
2. Include `/api/auth/kinde_callback` path
3. Check for trailing slashes
4. Verify `KINDE_SITE_URL` matches your domain

### Build Fails

**Symptom:** Vercel build error

**Solutions:**
1. Check build logs in Vercel dashboard
2. Test build locally: `npm run build`
3. Ensure all dependencies are in `package.json` (not just devDependencies for runtime needs)

### Prisma Client Not Generated

**Symptom:** `PrismaClient is not defined`

**Solution:** Ensure build command includes `prisma generate`:
```bash
prisma generate && prisma migrate deploy && next build
```

---

## Security Checklist

- [ ] All secrets stored in Vercel Environment Variables (not in code)
- [ ] `.env` files in `.gitignore`
- [ ] `NEXTAUTH_SECRET` is a strong random value
- [ ] Database password is strong and unique
- [ ] Supabase Row Level Security enabled (if using Supabase Auth)
- [ ] Custom domain uses HTTPS (Vercel handles this automatically)

---

## Monitoring & Maintenance

### Vercel Analytics
Enable in Vercel dashboard for:
- Page views
- Web Vitals
- Error tracking

### Supabase Dashboard
Monitor:
- Database size
- Connection count
- Query performance

### Uptime Monitoring
Consider adding:
- [Better Uptime](https://betteruptime.com)
- [UptimeRobot](https://uptimerobot.com)

---

## Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth, unlimited deploys | $20/mo Pro |
| Supabase | 500MB database, 2GB bandwidth | $25/mo Pro |
| Kinde | 7,500 MAU | $25/mo Pro |

Free tiers are sufficient for development and small production apps.

---

## Quick Reference

### Useful Commands

```bash
# Local development
npm run dev

# Build locally (test before deploy)
npm run build

# Run Prisma Studio (database GUI)
npx prisma studio

# Create new migration
npx prisma migrate dev --name your_migration_name

# Deploy migrations to production
DATABASE_URL="prod-url" npx prisma migrate deploy

# Reset database (DANGER - deletes all data)
npx prisma migrate reset
```

### Useful URLs

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Kinde Dashboard: https://app.kinde.com
- Prisma Docs: https://www.prisma.io/docs

---

## Support

For issues:
1. Check Vercel build logs
2. Check Supabase logs (Dashboard → Logs)
3. Check browser console for client-side errors
4. Review this troubleshooting section





