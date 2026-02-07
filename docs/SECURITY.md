# Security Notes (Hackathon-Grade)

This repo is production-shaped, not production-complete. Treat anything beyond Demo Mode as
**sensitive**.

## Golden Rules

- Never commit `.env*` (real keys go in `.env.local` or Vercel env vars).
- Bank tokens stay server-side only.
- Demo Mode must always work without keys.

## If A Secret Is Leaked

1. **Rotate the leaked key immediately.**
2. **Assume compromise**: audit recent logs, deployments, and access.
3. **Invalidate any derived credentials** (e.g. tokens generated using the leaked key).

## Rotation Checklist

### Supabase

- Rotate `SUPABASE_SERVICE_ROLE_KEY` in the Supabase dashboard.
- Confirm server routes still work (`/api/engine/analyze`, future `/api/plaid/*`).
- Verify no key strings appear in the client bundle (run `pnpm check-secrets`).

### Plaid

- Rotate `PLAID_SECRET` in the Plaid dashboard.
- Re-deploy serverless functions (Vercel) after env var updates.

### OpenAI (optional)

- Rotate `OPENAI_API_KEY`.
- Confirm `/api/ai/rewrite` still works (or continues to fall back safely when disabled).

### XRPL (optional)

- If `XRPL_TESTNET_SEED` is leaked, discard the wallet and generate a new testnet wallet/seed.
- Keep simulation mode available for judge reliability.

## CI Secret Scanning

CI runs gitleaks on PRs and pushes. If it fails:

- Identify the offending file/commit.
- Rotate keys first (assume leaked).
- Remove the secret from git history (don’t just delete the current file).
