import { readAdminAuditLogList } from '$lib/server/admin-audit-store';

export async function load() {
  const audit = await readAdminAuditLogList({ limit: 50 });

  return {
    entries: audit.entries,
    error: audit.error
  };
}
