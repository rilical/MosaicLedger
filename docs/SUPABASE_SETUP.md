# Supabase Setup (AUTH Epic)

## AUTH-001: Create Project (manual)

1. Create a Supabase project.
2. Auth settings:
   - Enable Email (magic link).
   - Add redirect URLs:
     - `http://localhost:3000/auth/callback`
     - Your Vercel preview/prod `https://<domain>/auth/callback`
3. Copy keys:
   - Project URL
   - Publishable (anon) key
   - Service role key (server-only, never expose)

## AUTH-002: Local env

Set these in `apps/web/.env.local` (gitignored):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (later, for server routes)

## AUTH-003/004: App behavior

- When Supabase env vars are present and `NEXT_PUBLIC_DEMO_MODE` is off:
  - `/app/*` requires a valid session, otherwise redirects to `/login`.
- When demo mode is on (default), `/app/*` is accessible (fail-safe demo requirement).

## AUTH-005: Schema

Apply `/supabase/schema.sql` in the Supabase SQL editor.

Verification:

- Open `/health` and check "Supabase schema" and "Schema Details".
- Optional CLI check (requires service role key in env): `pnpm check:supabase-schema`
