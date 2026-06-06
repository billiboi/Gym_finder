# RLS e policy

## Stato RLS per tabella

| table | rls_status_from_migrations | policy_count_from_migrations | note |
| --- | --- | --- | --- |
| admin_audit_log | not found in local migrations | 0 | REST OpenAPI non espone lo stato RLS live; dato ricostruito dalle migration locali. |
| claim_requests | enabled + forced | 0 | REST OpenAPI non espone lo stato RLS live; dato ricostruito dalle migration locali. |
| gyms | enabled | 1 | REST OpenAPI non espone lo stato RLS live; dato ricostruito dalle migration locali. |

## Statement RLS

### gyms - supabase/migrations/20260429_001_gyms_public_readonly_rls.sql

```sql
alter table public.gyms enable row level security;
```

### claim_requests - supabase/migrations/20260429_002_claim_requests_private_rls.sql

```sql
alter table public.claim_requests enable row level security;
```

### claim_requests - supabase/migrations/20260429_002_claim_requests_private_rls.sql

```sql
alter table public.claim_requests force row level security;
```

### claim_requests - supabase/migrations/20260509_001_claim_system.sql

```sql
alter table public.claim_requests enable row level security;
```

### claim_requests - supabase/migrations/20260509_001_claim_system.sql

```sql
alter table public.claim_requests force row level security;
```

### claim_requests - migrations/20260509_001_claim_system.sql

```sql
alter table public.claim_requests enable row level security;
```

### claim_requests - migrations/20260509_001_claim_system.sql

```sql
alter table public.claim_requests force row level security;
```

## Policy

### gyms.gyms_public_read - supabase/migrations/20260429_001_gyms_public_readonly_rls.sql

```sql
create policy "gyms_public_read" on public.gyms for select to anon, authenticated using (true);
```
