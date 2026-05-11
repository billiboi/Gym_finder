import { fail } from '@sveltejs/kit';
import { readClaimRequests, updateClaimRequestStatus } from '$lib/server/claim-request-store';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';
import { gymHref, slugifyGym } from '$lib/gym-detail';
import { readGyms, updateGymRecord } from '$lib/server/gym-store';

export async function load() {
  const requests = await readClaimRequests();

  return {
    requests
  };
}

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeForMatch(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugFromClaimUrl(value) {
  const raw = clean(value);
  if (!raw) return '';

  try {
    const url = new URL(raw, 'https://www.palestreinzona.it');
    const parts = url.pathname.split('/').filter(Boolean);
    const palestreIndex = parts.indexOf('palestre');
    return palestreIndex >= 0 ? parts[palestreIndex + 1] || '' : '';
  } catch {
    const parts = raw.split('/').filter(Boolean);
    const palestreIndex = parts.indexOf('palestre');
    return palestreIndex >= 0 ? parts[palestreIndex + 1] || '' : '';
  }
}

function findGymForClaim(gyms, claim) {
  const claimGymId = clean(claim?.gym_id);
  if (claimGymId) {
    const byId = gyms.find((gym) => clean(gym?.id) === claimGymId);
    if (byId) return byId;
  }

  const claimSlug = slugFromClaimUrl(claim?.gym_url);
  if (claimSlug) {
    const bySlug = gyms.find(
      (gym) => slugifyGym(gym) === claimSlug || clean(gym?._legacy_slug) === claimSlug || clean(gym?.slug) === claimSlug
    );
    if (bySlug) return bySlug;
  }

  const claimName = normalizeForMatch(claim?.gym_name);
  if (!claimName) return null;

  return gyms.find((gym) => normalizeForMatch(gym?.name || gym?.nome) === claimName) || null;
}

async function approveClaimAndVerifyGym({ claim, status, adminNotes }) {
  if (status !== 'approved') {
    return updateClaimRequestStatus(claim.id, status, adminNotes);
  }

  const gyms = await readGyms();
  const gym = findGymForClaim(gyms, claim);

  if (!gym) {
    throw new Error('Scheda collegata non trovata: approvazione bloccata per evitare un claim senza palestra.');
  }

  const now = new Date().toISOString();
  const updatedGym = {
    ...gym,
    is_verified: true,
    verified: true,
    data_verified_at: gym.data_verified_at || now,
    weekly_hours: {
      ...(gym.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {}),
      _verified: true,
      _owner_verified: true,
      _claim_request_id: claim.id,
      _claim_approved_at: now,
      _claim_requester_email: claim.requester_email
    }
  };

  const savedGymRows = await updateGymRecord(updatedGym);
  const savedGym = savedGymRows?.[0] || updatedGym;
  const updatedClaim = await updateClaimRequestStatus(claim.id, status, adminNotes, {
    gym_id: savedGym.id || gym.id
  });

  await writeAdminAuditLog({
    action: 'GYM_OWNER_VERIFIED_FROM_CLAIM',
    tableName: 'gyms',
    recordId: savedGym.id || gym.id,
    beforeData: {
      id: gym.id,
      href: gymHref(gym),
      is_verified: Boolean(gym.is_verified || gym.verified),
      claim_request_id: claim.id
    },
    afterData: {
      id: savedGym.id || gym.id,
      href: gymHref(savedGym),
      is_verified: true,
      owner_verified: true,
      claim_request_id: claim.id
    }
  });

  return updatedClaim;
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
      const requests = await readClaimRequests();
      const current = requests.find((item) => item.id === id);
      if (!current) throw new Error('Richiesta non trovata.');

      const updated = await approveClaimAndVerifyGym({ claim: current, status, adminNotes });
      await writeAdminAuditLog({
        action: `CLAIM_${String(status).toUpperCase()}`,
        tableName: 'claim_requests',
        recordId: id,
        beforeData: current,
        afterData: updated
      });
      return { success: true };
    } catch (error) {
      return fail(500, {
        error: error?.message || 'Impossibile aggiornare lo stato della richiesta.'
      });
    }
  }
};
