import { readGyms } from '$lib/server/gym-store';
import { gymsToAdminCsv } from '$lib/admin/gyms';

export async function GET() {
  const gyms = await readGyms();
  const csv = gymsToAdminCsv(Array.isArray(gyms) ? gyms : []);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="palestre-backup-${stamp}.csv"`,
      'Cache-Control': 'no-store'
    }
  });
}
