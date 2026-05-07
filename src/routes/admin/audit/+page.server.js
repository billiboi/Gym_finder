import { readAdminAuditLog } from '$lib/server/admin-audit-store';

export async function load() {
  const audit = await readAdminAuditLog({ limit: 50 });

  return {
    entries: audit.entries,
    error: audit.error
  };
}
