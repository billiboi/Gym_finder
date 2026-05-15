import { fail, redirect } from '@sveltejs/kit';
import { canWriteSupabase, readGyms, updateGymRecord } from '$lib/server/gym-store';
import { adminErrorMessage, archiveGym, isArchivedGym } from '$lib/admin/gyms';
import { DISCIPLINE_MASTER, DISCIPLINE_ALIAS_ROWS } from '$lib/discipline-taxonomy';
import { normalizeDisciplineField } from '$lib/disciplines';

function clean(value) {
  return String(value ?? '').trim();
}

function toDisciplines(value, fallback = 'Fitness') {
  return normalizeDisciplineField(value, clean(fallback).split('|').map((item) => item.trim()).filter(Boolean)).disciplines;
}

function disciplineAliases(value, fallback = []) {
  return normalizeDisciplineField(value, fallback).aliases;
}

async function getGymsWithFallback(fetchFn) {
  const gyms = await readGyms();
  if (Array.isArray(gyms) && gyms.length > 0) return gyms;

  try {
    const res = await fetchFn('/api/gyms');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function disciplineTextForGym(gym) {
  if (Array.isArray(gym?.disciplines) && gym.disciplines.length > 0) {
    return gym.disciplines.join(' | ');
  }

  return clean(gym?.discipline) || 'Fitness';
}

function getVerifiedState(gym) {
  return Boolean(gym?.is_verified || gym?.verified || gym?.weekly_hours?._verified);
}

function withVerifiedState(gym, verified) {
  return {
    ...gym,
    verified,
    is_verified: verified,
    weekly_hours: {
      ...(gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {}),
      _verified: verified
    }
  };
}

function suspiciousScore(gym) {
  if (getVerifiedState(gym)) return 0;

  const name = clean(gym?.name).toLowerCase();
  const disciplineText = disciplineTextForGym(gym);
  const onlyFitness = disciplineText === 'Fitness';

  if (!onlyFitness) return 0;

  const keywords = [
    'dojo', 'judo', 'karate', 'mma', 'box', 'boxing', 'kick', 'muay', 'jiu', 'ju-jitsu',
    'jujitsu', 'kung', 'wing chun', 'aikido', 'taekwondo', 'kempo', 'kenpo', 'arti marziali', 'shaolin'
  ];

  return keywords.some((keyword) => name.includes(keyword)) ? 2 : 1;
}

function parseIds(form) {
  const raw = clean(form.get('ids'));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => clean(id)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function load({ url, fetch }) {
  const gyms = await getGymsWithFallback(fetch);
  const activeGyms = gyms.filter((gym) => !isArchivedGym(gym));
  const persistentWrites = canWriteSupabase();

  const mapped = activeGyms
    .map((gym) => ({
      id: gym.id,
      name: gym.name || 'Senza nome',
      disciplineText: disciplineTextForGym(gym),
      city: gym.city || '',
      address: [gym.address, gym.city].filter(Boolean).join(', '),
      shortAddress: gym.address || gym.city || '',
      website: gym.website || '',
      verified: getVerifiedState(gym),
      suspiciousScore: suspiciousScore(gym)
    }))
    .sort((a, b) => {
      if (b.suspiciousScore !== a.suspiciousScore) return b.suspiciousScore - a.suspiciousScore;
      return a.name.localeCompare(b.name, 'it');
    });

  return {
    gyms: mapped,
    persistentWrites,
    disciplineOptions: DISCIPLINE_MASTER.map((discipline) => discipline.name),
    aliasSuggestions: DISCIPLINE_ALIAS_ROWS,
    saved: url.searchParams.get('saved') === '1',
    archived: url.searchParams.get('archived') === '1'
  };
}

export const actions = {
  save: async ({ request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const disciplineText = clean(form.get('disciplines'));
    const currentDisciplines = clean(form.get('current_disciplines'));

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const index = gyms.findIndex((gym) => gym.id === id);

    if (index < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    const disciplines = toDisciplines(disciplineText, currentDisciplines || disciplineTextForGym(gyms[index]));
    const aliases = disciplineAliases(disciplineText, disciplines);
    const verified = clean(form.get('verified')) === '1';
    gyms[index] = withVerifiedState({
      ...gyms[index],
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      weekly_hours: {
        ...(gyms[index]?.weekly_hours && typeof gyms[index].weekly_hours === 'object' ? gyms[index].weekly_hours : {}),
        _discipline_aliases: aliases
      }
    }, verified);

    try {
      await updateGymRecord(gyms[index]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Salvataggio non riuscito.') });
    }

    throw redirect(303, '/admin/riclassifica?saved=1');
  },
  delete: async ({ request, fetch }) => {
    // Guardrail anti-disastro: l'action resta "delete" solo per compatibilità.
    // Non usare delete reale su gyms; archiviare con archiveGym().
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Archiviazione bloccata: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const index = gyms.findIndex((gym) => gym.id === id);

    if (index < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    gyms[index] = archiveGym(gyms[index]);

    try {
      await updateGymRecord(gyms[index]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Archiviazione non riuscita.') });
    }

    throw redirect(303, '/admin/riclassifica?archived=1');
  },
  toggleVerified: async ({ request, fetch }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));

    if (!id) {
      return fail(400, { error: 'ID palestra mancante.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const index = gyms.findIndex((gym) => gym.id === id);

    if (index < 0) {
      return fail(404, { error: 'Palestra non trovata.' });
    }

    gyms[index] = withVerifiedState(gyms[index], !getVerifiedState(gyms[index]));

    try {
      await updateGymRecord(gyms[index]);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Salvataggio non riuscito.') });
    }

    throw redirect(303, '/admin/riclassifica?saved=1');
  },
  bulkUpdate: async ({ request, fetch }) => {
    // Le azioni bulk richiedono selezione esplicita lato UI e conferma per archiviazione.
    // Nessuna operazione bulk esegue cancellazioni fisiche.
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Azione bulk bloccata: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const ids = parseIds(form);
    const operation = clean(form.get('operation'));
    const bulkDisciplines = clean(form.get('bulk_disciplines'));

    if (ids.length === 0) {
      return fail(400, { error: 'Seleziona almeno un record.' });
    }

    if (!['verify', 'unverify', 'archive', 'apply-discipline'].includes(operation)) {
      return fail(400, { error: 'Operazione bulk non valida.' });
    }

    if (operation === 'apply-discipline' && !bulkDisciplines) {
      return fail(400, { error: 'Inserisci la disciplina da applicare alle schede selezionate.' });
    }

    const gyms = await getGymsWithFallback(fetch);
    const selected = new Set(ids);

    let touched = 0;
    const changedGyms = [];
    gyms.map((gym) => {
      if (!selected.has(clean(gym.id))) return gym;
      touched += 1;

      if (operation === 'archive') {
        const changed = archiveGym(gym);
        changedGyms.push(changed);
        return changed;
      }

      if (operation === 'apply-discipline') {
        const disciplines = toDisciplines(bulkDisciplines, disciplineTextForGym(gym));
        const aliases = disciplineAliases(bulkDisciplines, disciplines);
        const changed = {
          ...gym,
          discipline: disciplines[0],
          disciplines,
          discipline_aliases: aliases,
          weekly_hours: {
            ...(gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {}),
            _discipline_aliases: aliases
          }
        };
        changedGyms.push(changed);
        return changed;
      }

      const changed = withVerifiedState(gym, operation === 'verify');
      changedGyms.push(changed);
      return changed;
    });

    if (touched === 0) {
      return fail(404, { error: 'Nessun record selezionato trovato.' });
    }

    try {
      await Promise.all(changedGyms.map((gym) => updateGymRecord(gym)));
    } catch (err) {
      return fail(500, {
        error:
          adminErrorMessage(
            err,
            operation === 'archive' ? 'Archiviazione bulk non riuscita.' : 'Salvataggio bulk non riuscito.'
          )
      });
    }

    if (operation === 'archive') {
      throw redirect(303, '/admin/riclassifica?archived=1');
    }

    throw redirect(303, '/admin/riclassifica?saved=1');
  }
};
