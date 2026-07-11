import { readGyms } from '$lib/server/gym-store';
import { gymsToAdminCsv } from '$lib/admin/gyms';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';

// POST-only apposta: un GET puo' essere innescato da crawler, prefetch del
// browser o link preview senza che l'admin lo intenda davvero. Richiedere
// una submit esplicita (vedi /admin/sistema) e' la "conferma" richiesta
// dall'audit traffico, insieme al log qui sotto.
export async function POST() {
  const gyms = await readGyms();
  const rows = Array.isArray(gyms) ? gyms : [];
  const csv = gymsToAdminCsv(rows);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `palestre-backup-${stamp}.csv`;

  await writeAdminAuditLog({
    action: 'EXPORT_GYMS_CSV',
    recordId: filename,
    beforeData: null,
    afterData: { row_count: rows.length, filename }
  }).catch(() => {});

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
