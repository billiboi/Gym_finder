import { fail } from '@sveltejs/kit';
import { readClaimRequests, updateClaimRequestStatus } from '$lib/server/claim-request-store';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';

export async function load() {
  const requests = await readClaimRequests();

  return {
    requests
  };
}

export const actions = {
  updateStatus: async ({ request }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();
    const status = String(form.get('status') ?? '').trim();
    const adminNotes = String(form.get('admin_notes') ?? '').trim();

    if (!id || !status) {
      return fail(400, { error: 'ID richiesta o stato mancante.' });
    }

    try {
      const updated = await updateClaimRequestStatus(id, status, adminNotes);
      await writeAdminAuditLog({
        action: `CLAIM_${String(status).toUpperCase()}`,
        tableName: 'claim_requests',
        recordId: id,
        beforeData: { status },
        afterData: updated
      }).catch(() => {});
      return { success: true };
    } catch (error) {
      return fail(500, {
        error: error?.message || 'Impossibile aggiornare lo stato della richiesta.'
      });
    }
  }
};
