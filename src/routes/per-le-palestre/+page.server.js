import { fail } from '@sveltejs/kit';
import { createClaimRequest } from '$lib/server/claim-request-store';
import { PUBLIC_CATALOG_NUMBERS } from '$lib/trust';

const ALLOWED_PLANS = new Set(['Scheda verificata', 'Scheda premium', 'Partner locale']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizePlan(value) {
  const plan = clean(value);
  return ALLOWED_PLANS.has(plan) ? plan : 'Scheda verificata';
}

export const config = {
  isr: {
    expiration: 21600
  }
};

export async function load() {
  return {
    catalogTotalGyms: PUBLIC_CATALOG_NUMBERS.activeGyms,
    catalogTotalRecords: PUBLIC_CATALOG_NUMBERS.activeGyms,
    catalogTotalDisciplines: PUBLIC_CATALOG_NUMBERS.disciplines,
    catalogCuratedDisciplines: PUBLIC_CATALOG_NUMBERS.disciplines,
    catalogZonesAvailable: PUBLIC_CATALOG_NUMBERS.zonesLabel,
    catalogCuratedPages: PUBLIC_CATALOG_NUMBERS.curatedPagesLabel
  };
}

export const actions = {
  lead: async ({ request }) => {
    const form = await request.formData();
    const plan = normalizePlan(form.get('plan'));
    const values = {
      gym_name: clean(form.get('gym_name')),
      requester_name: clean(form.get('requester_name')),
      requester_role: clean(form.get('requester_role')),
      requester_email: clean(form.get('requester_email')),
      requester_phone: clean(form.get('requester_phone')),
      website: clean(form.get('website')),
      plan,
      message: clean(form.get('message'))
    };

    if (!values.gym_name || !values.requester_name || !values.requester_email) {
      return fail(400, {
        success: false,
        error: 'Inserisci almeno palestra, referente ed email.',
        values
      });
    }

    const message = [
      `Piano richiesto: ${values.plan}`,
      values.website ? `Sito palestra: ${values.website}` : '',
      values.message ? `Messaggio: ${values.message}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const saved = await createClaimRequest({
        gym_name: values.gym_name,
        gym_url: values.website,
        reason: 'Collaborazione commerciale',
        requester_name: values.requester_name,
        requester_role: values.requester_role || 'Referente palestra',
        requester_email: values.requester_email,
        requester_phone: values.requester_phone,
        message
      });

      return {
        success: true,
        requestId: saved.id,
        values: {
          plan
        }
      };
    } catch (error) {
      return fail(500, {
        success: false,
        error: error?.message || 'Non sono riuscito a salvare il lead. Riprova tra poco.',
        values
      });
    }
  }
};
