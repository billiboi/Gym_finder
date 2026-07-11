import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { gymHref } from '$lib/gym-detail';
import {
  canWriteSupabase,
  gymStoreStatus,
  readAdminGymById,
  readAdminGymList,
  writeGymRecords
} from '$lib/server/gym-store';
import {
  clean,
  disciplineAliases,
  disciplineSlugs,
  isValidImageUrl,
  normalizePhone,
  persistentImageFromFile,
  toDisciplines,
  toNullableNumber,
  validateGymPayload
} from '$lib/server/gym-form-fields';
import {
  adminErrorMessage,
  adminGymView,
  archiveGym,
  duplicateGym,
  restoreGym
} from '$lib/admin/gyms';
import { DISCIPLINE_MASTER, DISCIPLINE_ALIAS_ROWS } from '$lib/discipline-taxonomy';

function adminListMode(value) {
  const mode = clean(value);
  return ['active', 'archived', 'all'].includes(mode) ? mode : 'active';
}

export async function load({ url }) {
  const limit = url.searchParams.get('limit');
  const offset = url.searchParams.get('offset');
  const q = url.searchParams.get('q') || '';
  const archived = adminListMode(url.searchParams.get('archived'));
  const gymList = await readAdminGymList({ limit, offset, q, archived });
  const persistentWrites = canWriteSupabase();

  return {
    gyms: (gymList.items || [])
      .map((gym) => ({
        ...adminGymView(gym),
        publicHref: gymHref(gym)
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it')),
    limit: gymList.limit,
    offset: gymList.offset,
    hasMore: gymList.hasMore,
    total: gymList.total ?? null,
    q: gymList.q,
    archivedMode: gymList.archived,
    persistentWrites,
    disciplineOptions: DISCIPLINE_MASTER.map((discipline) => discipline.name),
    aliasSuggestions: DISCIPLINE_ALIAS_ROWS,
    storeStatus: gymStoreStatus(),
    archived: url.searchParams.get('archived') === '1',
    restored: url.searchParams.get('restored') === '1',
    duplicated: url.searchParams.get('duplicated') === '1',
    created: url.searchParams.get('created') === '1',
    updated: url.searchParams.get('updated') === '1'
  };
}

export const actions = {
  create: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        createError:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const name = clean(form.get('name'));
    const disciplines = toDisciplines(form.get('discipline'));
    const aliases = disciplineAliases(form.get('discipline'), disciplines);
    const canonicalSlugs = disciplineSlugs(form.get('discipline'), disciplines);
    const address = clean(form.get('address'));
    const city = clean(form.get('city'));
    const website = clean(form.get('website'));
    const validationError = validateGymPayload({ name, city, disciplines, website });

    if (validationError) return fail(400, { createError: validationError });

    let imageUrl = clean(form.get('image_url'));
    if (!isValidImageUrl(imageUrl)) {
      return fail(400, { createError: 'URL immagine non valido. Usa un URL http/https oppure carica un file.' });
    }

    try {
      const uploadedImage = form.get('image');
      if (uploadedImage instanceof File && uploadedImage.size > 0) {
        imageUrl = await persistentImageFromFile(uploadedImage, name);
      }
    } catch (err) {
      return fail(400, { createError: err?.message || 'Errore durante il caricamento immagine.' });
    }

    const verified = clean(form.get('verified')) === '1';
    const premium = clean(form.get('premium')) === '1';

    const nextGym = {
      id: `gym-${randomUUID()}`,
      name,
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      discipline_canonical_slugs: canonicalSlugs,
      address,
      city,
      phone: normalizePhone(form.get('phone')),
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      website,
      description: clean(form.get('description')),
      verified,
      is_verified: verified,
      is_premium: premium,
      latitude: toNullableNumber(form.get('latitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl,
      weekly_hours: {
        _verified: verified,
        _is_premium: premium,
        _image_url: imageUrl,
        _discipline_aliases: aliases,
        _discipline_canonical_slugs: canonicalSlugs
      }
    };

    try {
      await writeGymRecords(nextGym);
    } catch (err) {
      return fail(500, { createError: adminErrorMessage(err, 'Creazione non riuscita.') });
    }

    throw redirect(303, '/admin/schede?created=1');
  },

  delete: async ({ request }) => {
    // Guardrail anti-disastro: questa action mantiene il nome storico "delete"
    // per compatibilità con i form esistenti, ma non cancella mai record gyms.
    // Ogni rimozione admin deve passare da archiveGym().
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Archiviazione bloccata: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const gym = await readAdminGymById(id);

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (!gym) return fail(404, { error: 'Palestra non trovata.' });

    const archivedGym = archiveGym(gym);

    try {
      await writeGymRecords(archivedGym);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Archiviazione non riuscita.') });
    }

    throw redirect(303, '/admin/schede?archived=1');
  },

  restore: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Ripristino bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const gym = await readAdminGymById(id);

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (!gym) return fail(404, { error: 'Palestra non trovata.' });

    const restoredGym = restoreGym(gym);

    try {
      await writeGymRecords(restoredGym);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Ripristino non riuscito.') });
    }

    throw redirect(303, '/admin/schede?restored=1');
  },

  duplicate: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Duplicazione bloccata: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const source = await readAdminGymById(id);

    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (!source) return fail(404, { error: 'Palestra non trovata.' });

    try {
      await writeGymRecords(duplicateGym(source, `gym-${randomUUID()}`));
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Duplicazione non riuscita.') });
    }

    throw redirect(303, '/admin/schede?duplicated=1');
  }
};
