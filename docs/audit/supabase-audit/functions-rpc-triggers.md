# Funzioni/RPC e trigger

## RPC esposte da REST staging

- rpc/gyms_quality_score_from_row

## Funzioni da migration locali

### gyms_quality_score_from_row - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
create or replace function public.gyms_quality_score_from_row(row_data jsonb) returns smallint language plpgsql stable as $$ declare score smallint := 0;
```

### gyms_before_write_guard - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
create or replace function public.gyms_before_write_guard() returns trigger language plpgsql as $$ begin new.updated_at := now();
```

### gyms_audit_log_write - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
create or replace function public.gyms_audit_log_write() returns trigger language plpgsql security definer as $$ begin insert into public.admin_audit_log (action, table_name, record_id, before_data, after_data) values ( tg_op, tg_table_name, coalesce(new.id::text, old.id::text), case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end, case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end );
```

### gyms_block_physical_delete - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
create or replace function public.gyms_block_physical_delete() returns trigger language plpgsql as $$ begin raise exception 'Cancellazione fisica bloccata: usa deleted_at per archiviare la scheda.';
```

## Trigger da migration locali

### gyms_before_write_guard_trigger on gyms - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
do $$ begin if not exists ( select 1 from pg_trigger where tgname = 'gyms_before_write_guard_trigger' ) then create trigger gyms_before_write_guard_trigger before insert or update on public.gyms for each row execute function public.gyms_before_write_guard();
```

### gyms_audit_log_write_trigger on gyms - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
if not exists ( select 1 from pg_trigger where tgname = 'gyms_audit_log_write_trigger' ) then create trigger gyms_audit_log_write_trigger after insert or update on public.gyms for each row execute function public.gyms_audit_log_write();
```

### gyms_block_physical_delete_trigger on gyms - supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
if not exists ( select 1 from pg_trigger where tgname = 'gyms_block_physical_delete_trigger' ) then create trigger gyms_block_physical_delete_trigger before delete on public.gyms for each row execute function public.gyms_block_physical_delete();
```
