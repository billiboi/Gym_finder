# Supabase security notes

## `claim_requests`

If Supabase reports `Table publicly accessible` / `rls_disabled_in_public` for `claim_requests`, run:

- `supabase/claim_requests_rls.sql`

This project expects `claim_requests` to be accessible only from the server with `SUPABASE_SERVICE_ROLE_KEY`.
Do not expose this table to `anon` or `authenticated` users.

Required server envs:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional: `SUPABASE_CLAIMS_TABLE`

If `SUPABASE_SERVICE_ROLE_KEY` is missing, the claim flow should fail closed instead of falling back to a public key.
