import { fail } from '@sveltejs/kit';
import { findClaimRequestByOwnerToken, submitOwnerClaimUpdate } from '$lib/server/claim-request-store';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';

function clean(value) {
  return String(value ?? '').trim();
}

function lines(value) {
  return clean(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function load({ params }) {
  const claim = await findClaimRequestByOwnerToken(params.token);

  return {
    claim,
    token: params.token,
    canUseDashboard: Boolean(claim && claim.status === 'approved' && claim.email_verified_at)
  };
}

export const actions = {
  submitUpdates: async ({ request, params }) => {
    const form = await request.formData();
    const updates = {
      orari: clean(form.get('orari')),
      telefono: clean(form.get('telefono')),
      email: clean(form.get('email')),
      sito: clean(form.get('sito')),
      descrizione: clean(form.get('descrizione')),
      image_uploads: lines(form.get('image_uploads')),
      verifica_richiesta: clean(form.get('verifica_richiesta')) === 'on',
      note: clean(form.get('note'))
    };

    if (!updates.orari && !updates.telefono && !updates.email && !updates.sito && !updates.descrizione && !updates.image_uploads.length && !updates.note) {
      return fail(400, {
        error: 'Inserisci almeno un aggiornamento da inviare in revisione.',
        values: updates
      });
    }

    try {
      const updated = await submitOwnerClaimUpdate(params.token, updates);
      await writeAdminAuditLog({
        action: 'OWNER_UPDATE_SUBMITTED',
        tableName: 'claim_requests',
        recordId: updated.id,
        beforeData: { owner_token: params.token },
        afterData: { requested_updates: updated.requested_updates, image_uploads: updated.image_uploads }
      }).catch(() => {});

      return {
        success: true,
        values: updates
      };
    } catch (error) {
      return fail(500, {
        error: error?.message || 'Invio aggiornamenti non riuscito.',
        values: updates
      });
    }
  }
};
