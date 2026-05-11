import { fail } from '@sveltejs/kit';
import { canPersistClaimRequests, createClaimRequest } from '$lib/server/claim-request-store';

const ALLOWED_REASONS = new Set([
  'Aggiornamento dati',
  'Correzione scheda',
  'Rivendicazione scheda',
  'Collaborazione commerciale'
]);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeReason(value) {
  const cleaned = clean(value);
  return ALLOWED_REASONS.has(cleaned) ? cleaned : 'Aggiornamento dati';
}

export async function load({ url }) {
  return {
    prefill: {
      gym_id: clean(url.searchParams.get('gym_id')),
      gym: clean(url.searchParams.get('gym')),
      url: clean(url.searchParams.get('url')),
      reason: normalizeReason(url.searchParams.get('reason'))
    },
    verified: url.searchParams.get('verified') === '1',
    verifyError: clean(url.searchParams.get('verify_error')),
    persistentClaimFlow: canPersistClaimRequests()
  };
}

export const actions = {
  submit: async ({ request }) => {
    const form = await request.formData();

    const payload = {
      gym_id: clean(form.get('gym_id')),
      gym_name: clean(form.get('gym_name')),
      gym_url: clean(form.get('gym_url')),
      reason: normalizeReason(form.get('reason')),
      requester_name: clean(form.get('requester_name')),
      requester_role: clean(form.get('requester_role')),
      requester_email: clean(form.get('requester_email')),
      requester_phone: clean(form.get('requester_phone')),
      official_website: clean(form.get('official_website')),
      image_url: clean(form.get('image_url')),
      message: clean(form.get('message'))
    };

    if (!payload.gym_name || !payload.requester_name || !payload.requester_email || !payload.message) {
      return fail(400, {
        success: false,
        error: 'Compila almeno palestra, nome, email e descrizione della richiesta.',
        values: payload
      });
    }

    try {
      const saved = await createClaimRequest({
        ...payload,
        requested_updates: {
          sito: payload.official_website,
          official_source_url: payload.official_website,
          image_url: payload.image_url
        },
        image_uploads: payload.image_url ? [payload.image_url] : []
      });
      return {
        success: true,
        requestId: saved.id,
        emailVerificationRequired: true,
        values: payload
      };
    } catch (error) {
      return fail(500, {
        success: false,
        error: error?.message || 'Impossibile salvare la richiesta in questo momento.',
        values: payload
      });
    }
  }
};
