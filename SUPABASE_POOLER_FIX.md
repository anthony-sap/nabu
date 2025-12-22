# Supabase Connection Pooler Fix

## Problem
Error: `prepared statement "s3" does not exist`

This happens when using Supabase's connection pooler (port 6543) with Prisma.

## Solutions (Pick ONE)

### ✅ Solution 1: Add pgbouncer flag (Recommended)
Add `?pgbouncer=true` to your DATABASE_URL in `.env`:

```env
DATABASE_URL="postgresql://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**Pros**: Works with pooler, good for production
**Cons**: Slightly slower for some operations

### 🔄 Solution 2: Use Direct Connection (Session Pooler)
Change port from `6543` to `5432`:

```env
DATABASE_URL="postgresql://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**Pros**: Best performance, no prepared statement issues
**Cons**: Limited connections (60 max in free tier)

### ⚙️ Solution 3: Disable Prepared Statements in Prisma
Add to `datasource db` in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
  preparedStatements = false
}
```

Then regenerate client: `npx prisma generate`

**Pros**: Works with transaction pooler
**Cons**: Performance impact on repeated queries

## Which Should You Use?

- **Development**: Solution 2 (direct connection, port 5432) - best performance
- **Production**: Solution 1 (pgbouncer=true) - handles more concurrent connections

## Testing After Fix

1. Save your `.env` file
2. Restart your dev server: `npm run dev`
3. Try editing a note again

The error should be gone!

## More Info

- [Supabase Pooler Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with PgBouncer](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer)


