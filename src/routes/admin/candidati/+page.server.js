import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import {
  canWriteGymCandidates,
  gymCandidatesStoreStatus,
  readAdminGymCandidateById,
  readAdminGymCandidatesList,
  updateGymCandidateStatus
} from '$lib/server/gym-candidates-store';
import { canWriteSupabase, writeGymRecords } from '$lib/server/gym-store';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';
import { adminErrorMessage } from '$lib/admin/gyms';
import { gymHref } from '$lib/gym-detail';
import { normalizeDisciplineField, normalizeDisciplineSlugs } from '$lib/disciplines';

function clean(value) {
  return String(value ?? '').trim();
}

function toNullableNumber(value) {
  const raw = clean(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toDisciplines(value) {
  return normalizeDisciplineField(value, []).disciplines;
}

function disciplineAliases(value, fallback = []) {
  return normalizeDisciplineField(value, fallback).aliases;
}

function isValidUrl(value) {
  const raw = clean(value);
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function statusFilterParam(value) {
  const status = clean(value);
  return ['pending', 'approved', 'rejected', 'merged', 'all'].includes(status) ? status : 'pending';
}

export async function load({ url }) {
  const statusFilter = statusFilterParam(url.searchParams.get('status'));
  const list = await readAdminGymCandidatesList({
    limit: 200,
    status: statusFilter === 'all' ? '' : statusFilter
  });

  return {
    candidates: list.items,
    listError: list.error,
    statusFilter,
    persistentWrites: canWriteSupabase(),
    candidatesStoreStatus: gymCandidatesStoreStatus(),
    approved: url.searchParams.get('approved') === '1',
    rejected: url.searchParams.get('rejected') === '1',
    merged: url.searchParams.get('merged') === '1'
  };
}

export const actions = {
  approve: async ({ request }) => {
    if (!canWriteSupabase() || !canWriteGymCandidates()) {
      return fail(503, {
        error: 'Approvazione bloccata: SUPABASE_SERVICE_ROLE_KEY non disponibile per questo ambiente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    if (!id) return fail(400, { error: 'ID candidato mancante.' });

    const candidate = await readAdminGymCandidateById(id);
    if (!candidate) return fail(404, { error: 'Candidato non trovato.' });
    if (candidate.status !== 'pending') {
      return fail(400, { error: `Candidato già revisionato (stato attuale: ${candidate.status}).` });
    }

    const name = clean(form.get('nome')) || candidate.nome;
    const city = clean(form.get('citta')) || candidate.citta;
    const disciplineInput = clean(form.get('discipline')) || candidate.disciplines.join('|');
    const disciplines = toDisciplines(disciplineInput);
    const aliases = disciplineAliases(disciplineInput, disciplines);
    const canonicalSlugs = normalizeDisciplineSlugs(disciplineInput, disciplines);
    const website = clean(form.get('sito'));

    if (!name) return fail(400, { error: 'Nome palestra obbligatorio.', editId: id });
    if (!city) return fail(400, { error: 'Città/località obbligatoria.', editId: id });
    if (!disciplines.length) return fail(400, { error: 'Inserisci almeno una disciplina prima di approvare.', editId: id });
    if (!isValidUrl(website)) return fail(400, { error: 'Il sito web deve essere un URL valido con http:// o https://.', editId: id });

    const nextGym = {
      id: `gym-${randomUUID()}`,
      name,
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      discipline_canonical_slugs: canonicalSlugs,
      address: clean(form.get('indirizzo')) || candidate.indirizzo,
      city,
      phone: clean(form.get('telefono')) || candidate.telefono,
      hours_info: clean(form.get('orari')) || candidate.orari || 'Orari da verificare',
      website,
      description: clean(form.get('descrizione')) || candidate.descrizione,
      verified: false,
      is_verified: false,
      is_premium: false,
      latitude: toNullableNumber(form.get('latitude')) ?? candidate.latitude,
      longitude: toNullableNumber(form.get('longitude')) ?? candidate.longitude,
      image_url: '',
      weekly_hours: {
        _verified: false,
        _is_premium: false,
        _discipline_aliases: aliases,
        _discipline_canonical_slugs: canonicalSlugs,
        _source: candidate.source,
        _source_id: candidate.source_id,
        _source_url: candidate.source_url,
        _gym_candidate_id: candidate.id
      }
    };

    try {
      await writeGymRecords(nextGym);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Pubblicazione scheda non riuscita.'), editId: id });
    }

    const updatedCandidate = await updateGymCandidateStatus(id, {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
      published_gym_id: nextGym.id
    });

    await writeAdminAuditLog({
      action: 'GYM_CANDIDATE_APPROVED',
      tableName: 'gym_candidates',
      recordId: id,
      beforeData: { id: candidate.id, nome: candidate.nome, citta: candidate.citta, status: candidate.status },
      afterData: {
        id: updatedCandidate.id,
        status: updatedCandidate.status,
        published_gym_id: nextGym.id,
        published_gym_href: gymHref(nextGym)
      }
    });

    throw redirect(303, `/admin/candidati?status=pending&approved=1`);
  },

  reject: async ({ request }) => {
    if (!canWriteGymCandidates()) {
      return fail(503, { error: 'Rifiuto bloccato: SUPABASE_SERVICE_ROLE_KEY non disponibile per questo ambiente.' });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const reason = clean(form.get('rejection_reason'));
    if (!id) return fail(400, { error: 'ID candidato mancante.' });

    const candidate = await readAdminGymCandidateById(id);
    if (!candidate) return fail(404, { error: 'Candidato non trovato.' });
    if (candidate.status !== 'pending') {
      return fail(400, { error: `Candidato già revisionato (stato attuale: ${candidate.status}).` });
    }

    try {
      const updated = await updateGymCandidateStatus(id, {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin',
        rejection_reason: reason
      });

      await writeAdminAuditLog({
        action: 'GYM_CANDIDATE_REJECTED',
        tableName: 'gym_candidates',
        recordId: id,
        beforeData: { id: candidate.id, nome: candidate.nome, citta: candidate.citta, status: candidate.status },
        afterData: { id: updated.id, status: updated.status, rejection_reason: reason }
      });
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Rifiuto non riuscito.') });
    }

    throw redirect(303, `/admin/candidati?status=pending&rejected=1`);
  },

  merge: async ({ request }) => {
    if (!canWriteGymCandidates()) {
      return fail(503, { error: 'Merge bloccato: SUPABASE_SERVICE_ROLE_KEY non disponibile per questo ambiente.' });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const targetGymId = clean(form.get('target_gym_id'));
    if (!id) return fail(400, { error: 'ID candidato mancante.' });
    if (!targetGymId) return fail(400, { error: 'ID scheda esistente mancante: indica con quale scheda unire il candidato.' });

    const candidate = await readAdminGymCandidateById(id);
    if (!candidate) return fail(404, { error: 'Candidato non trovato.' });
    if (candidate.status !== 'pending') {
      return fail(400, { error: `Candidato già revisionato (stato attuale: ${candidate.status}).` });
    }

    try {
      const updated = await updateGymCandidateStatus(id, {
        status: 'merged',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin',
        published_gym_id: targetGymId
      });

      await writeAdminAuditLog({
        action: 'GYM_CANDIDATE_MERGED',
        tableName: 'gym_candidates',
        recordId: id,
        beforeData: { id: candidate.id, nome: candidate.nome, citta: candidate.citta, status: candidate.status },
        afterData: { id: updated.id, status: updated.status, published_gym_id: targetGymId }
      });
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Merge non riuscito.') });
    }

    throw redirect(303, `/admin/candidati?status=pending&merged=1`);
  }
};
