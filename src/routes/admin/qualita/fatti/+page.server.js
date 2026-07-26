import { fail } from '@sveltejs/kit';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';
import { approveFact, readFactsReviewQueue, rejectFact } from '$lib/server/gym-facts-store';

export async function load({ url }) {
  const includeFilled = url.searchParams.get('tutti') === '1';

  try {
    const queue = await readFactsReviewQueue({ includeFilled });
    return { includeFilled, ...queue, error: '' };
  } catch (error) {
    return {
      includeFilled,
      available: false,
      rows: [],
      counts: { total: 0, fillsEmpty: 0, alreadyFilled: 0, byField: {}, byConfidence: {} },
      error: error?.message || 'Impossibile leggere la coda di revisione.'
    };
  }
}

export const actions = {
  approva: async ({ request }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();
    const notes = String(form.get('notes') ?? '').trim();
    const allowOverwrite = String(form.get('allow_overwrite') ?? '') === '1';

    if (!id) return fail(400, { error: 'ID del fatto mancante.' });

    try {
      const result = await approveFact({ id, notes, allowOverwrite });
      await writeAdminAuditLog({
        action: 'GYM_FACT_APPROVED',
        tableName: 'gym_facts',
        recordId: id,
        beforeData: result.before,
        afterData: result.patch
      });
      return { success: `${result.field} promosso su ${result.gymName}.` };
    } catch (error) {
      return fail(500, { error: error?.message || 'Impossibile promuovere il fatto.' });
    }
  },

  rifiuta: async ({ request }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '').trim();
    const notes = String(form.get('notes') ?? '').trim();

    if (!id) return fail(400, { error: 'ID del fatto mancante.' });

    try {
      const result = await rejectFact({ id, notes });
      await writeAdminAuditLog({
        action: 'GYM_FACT_REJECTED',
        tableName: 'gym_facts',
        recordId: id,
        beforeData: { gym_id: result.gymId, field: result.field, value: result.value },
        afterData: { review_status: 'rejected', review_notes: notes }
      });
      return { success: `${result.field} rifiutato.` };
    } catch (error) {
      return fail(500, { error: error?.message || 'Impossibile rifiutare il fatto.' });
    }
  }
};
