import { error, fail, redirect } from '@sveltejs/kit';
import { gymHref } from '$lib/gym-detail';
import { canWriteSupabase, readAdminGymById, updateGymRecord } from '$lib/server/gym-store';
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
import { adminErrorMessage, adminGymView } from '$lib/admin/gyms';
import { DISCIPLINE_MASTER, DISCIPLINE_ALIAS_ROWS } from '$lib/discipline-taxonomy';
import { generateGymDescription, pickPublicDescription, scoreDescription } from '$lib/gym-description';
import { analyzeGymOfficialSite, appendAdminNote, normalizeFaqItems } from '$lib/server/official-content-analysis';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';

function parseJsonPayload(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function load({ params }) {
  const gym = await readAdminGymById(params.id);

  if (!gym) {
    throw error(404, 'Palestra non trovata');
  }

  const publicDescription = pickPublicDescription(gym);

  return {
    gym: {
      ...adminGymView(gym),
      discipline_text: Array.isArray(gym.disciplines) && gym.disciplines.length
        ? gym.disciplines.join(' | ')
        : clean(gym.discipline) || 'Fitness',
      descrizione_pubblica_attuale: publicDescription.text,
      descrizione_pubblica_source: publicDescription.source,
      // Non abbiamo più l'intero catalogo qui (era un readGyms() di ~700 righe
      // solo per trovarne una): il confronto "sede/catena con nome simile" di
      // generateGymDescription degrada a nessun rischio rilevato invece di
      // interrompere l'anteprima. È solo un suggerimento che l'admin rivede
      // prima di salvare, non un dato scritto automaticamente.
      descrizione_generata_preview: gym.descrizione_generata || generateGymDescription(gym, []).description,
      descrizione_quality_score_calculated: scoreDescription(gym, publicDescription.text),
      descrizione_owner: gym.descrizione_owner || '',
      descrizione_editoriale: gym.descrizione_editoriale || '',
      descrizione_generata: gym.descrizione_generata || '',
      descrizione_pubblica: gym.descrizione_pubblica || '',
      descrizione_source: gym.descrizione_source || '',
      descrizione_quality_score: gym.descrizione_quality_score || 0,
      descrizione_needs_review: Boolean(gym.descrizione_needs_review)
    },
    disciplineOptions: DISCIPLINE_MASTER.map((discipline) => discipline.name),
    aliasSuggestions: DISCIPLINE_ALIAS_ROWS
  };
}

export const actions = {
  default: async ({ params, request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
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

    if (validationError) return fail(400, { error: validationError });

    const currentGym = await readAdminGymById(params.id);

    if (!currentGym) return fail(404, { error: 'Palestra non trovata.' });

    let imageUrl = clean(form.get('image_url')) || currentGym.image_url || '';
    if (!isValidImageUrl(imageUrl)) {
      return fail(400, { error: 'URL immagine non valido. Usa un URL http/https oppure carica un file.' });
    }

    try {
      const uploadedImage = form.get('image');
      const replaceImage = clean(form.get('replace_image')) === '1';
      if (uploadedImage instanceof File && uploadedImage.size > 0) {
        imageUrl = await persistentImageFromFile(uploadedImage, name);
      } else if (replaceImage && !clean(form.get('image_url'))) {
        imageUrl = '';
      }
    } catch (err) {
      return fail(400, { error: err?.message || 'Errore durante il caricamento immagine.' });
    }

    const verified = clean(form.get('verified')) === '1';
    const premium = clean(form.get('premium')) === '1';
    const weeklyHours = currentGym?.weekly_hours && typeof currentGym.weekly_hours === 'object' ? currentGym.weekly_hours : {};

    const updatedGym = {
      ...currentGym,
      nome: name,
      name,
      discipline: disciplines[0],
      disciplines,
      discipline_aliases: aliases,
      discipline_canonical_slugs: canonicalSlugs,
      indirizzo: address,
      address,
      citta: city,
      city,
      telefono: normalizePhone(form.get('phone')),
      phone: normalizePhone(form.get('phone')),
      orari: clean(form.get('hours_info')) || 'Orari da verificare',
      hours_info: clean(form.get('hours_info')) || 'Orari da verificare',
      sito: website,
      website,
      descrizione: clean(form.get('description')),
      description: clean(form.get('description')),
      descrizione_owner: clean(form.get('descrizione_owner')) || currentGym.descrizione_owner || '',
      descrizione_editoriale: clean(form.get('descrizione_editoriale')) || '',
      descrizione_generata: clean(form.get('descrizione_generata')) || currentGym.descrizione_generata || '',
      descrizione_pubblica: clean(form.get('descrizione_pubblica')) || '',
      descrizione_source: clean(form.get('descrizione_source')) || 'admin',
      descrizione_quality_score: toNullableNumber(form.get('descrizione_quality_score')) || 0,
      descrizione_needs_review: clean(form.get('descrizione_needs_review')) === '1',
      verified,
      is_verified: verified,
      is_premium: premium,
      lat: toNullableNumber(form.get('latitude')),
      latitude: toNullableNumber(form.get('latitude')),
      lng: toNullableNumber(form.get('longitude')),
      longitude: toNullableNumber(form.get('longitude')),
      image_url: imageUrl,
      weekly_hours: {
        ...weeklyHours,
        _verified: verified,
        _is_premium: premium,
        _image_url: imageUrl,
        _discipline_aliases: aliases,
        _discipline_canonical_slugs: canonicalSlugs
      }
    };

    try {
      await updateGymRecord(updatedGym);
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Salvataggio non riuscito.') });
    }

    if (clean(form.get('next_action')) === 'open_public') {
      throw redirect(303, gymHref(updatedGym));
    }

    throw redirect(303, `/admin/gyms/${params.id}?saved=1`);
  },

  analyzeOfficialSite: async ({ params }) => {
    const currentGym = await readAdminGymById(params.id);
    if (!currentGym) return fail(404, { error: 'Palestra non trovata.' });

    const officialAnalysis = await analyzeGymOfficialSite(currentGym);
    return { officialAnalysis };
  },

  acceptContentField: async ({ params, request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Salvataggio bloccato: questa area admin deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile nell\'ambiente corrente.'
      });
    }

    const form = await request.formData();
    const field = clean(form.get('field'));
    const value = clean(form.get('value'));
    const sourceUrl = clean(form.get('source_url'));

    if (!['telefono', 'orari', 'prezzi'].includes(field)) {
      return fail(400, { error: 'Campo non valido.' });
    }
    if (!value) {
      return fail(400, { error: 'Valore proposto assente.' });
    }

    const currentGym = await readAdminGymById(params.id);
    if (!currentGym) return fail(404, { error: 'Palestra non trovata.' });

    const now = new Date().toISOString();
    const note = `Campo "${field}" aggiornato da fonte ufficiale in admin il ${now}.${sourceUrl ? ` Fonte: ${sourceUrl}.` : ''}`;

    const patch =
      field === 'telefono'
        ? { telefono: normalizePhone(value), phone: normalizePhone(value) }
        : field === 'orari'
          ? { orari: value, hours_info: value }
          : { price_info: value, price_source_url: sourceUrl || currentGym.price_source_url || '', price_updated_at: now };

    patch.enrichment_notes = appendAdminNote(currentGym.enrichment_notes, note);

    try {
      await updateGymRecord({ ...currentGym, ...patch });
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Salvataggio non riuscito.') });
    }

    await writeAdminAuditLog({
      action: 'CONTENT_ACCEPT_FIELD',
      recordId: params.id,
      beforeData: { [field]: currentGym[field] },
      afterData: patch
    }).catch(() => {});

    return { contentFieldAccepted: { field, value } };
  },

  approveEditorial: async ({ params, request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error: 'Pubblicazione bloccata: questa azione deve scrivere su Supabase, ma SUPABASE_SERVICE_ROLE_KEY non è disponibile.'
      });
    }

    const form = await request.formData();
    const approvalType = clean(form.get('approval_type'));
    const payload = parseJsonPayload(form.get('editorial_payload'));

    if (!['breve', 'lunga', 'tutto'].includes(approvalType)) {
      return fail(400, { error: 'Tipo approvazione non valido.' });
    }

    if (payload?.conflicts?.length) {
      return fail(400, { error: 'Pubblicazione bloccata: la preview contiene conflitti nel confronto scheda/fonte.' });
    }

    const preview = payload?.editorial_preview || {};
    const shortText = clean(preview.descrizione_breve);
    const longText = clean(preview.descrizione_lunga);

    if ((approvalType === 'breve' || approvalType === 'tutto') && !shortText) {
      return fail(400, { error: 'Descrizione breve assente.' });
    }
    if ((approvalType === 'lunga' || approvalType === 'tutto') && !longText) {
      return fail(400, { error: 'Descrizione lunga assente.' });
    }

    const currentGym = await readAdminGymById(params.id);
    if (!currentGym) return fail(404, { error: 'Palestra non trovata.' });

    const now = new Date().toISOString();
    const source = clean(payload.source_url || currentGym.sito || currentGym.website);
    const auditNote = `Editoriale approvato in admin (${approvalType}) il ${now}. Livello ${clean(preview.livello) || 'n/d'}, quality score ${Number(preview.quality_score || 0)}. Fonte: ${source || 'solo dati scheda'}.`;

    const patch = {
      descrizione_source: `admin_editorial_preview:${approvalType}:${now}`,
      descrizione_quality_score: Number(preview.quality_score || 0) || 0,
      descrizione_needs_review: false,
      enrichment_status: 'published',
      enrichment_updated_at: now,
      enrichment_notes: appendAdminNote(currentGym.enrichment_notes, auditNote),
      official_source_url: source || currentGym.official_source_url || ''
    };

    if (approvalType === 'breve' || approvalType === 'tutto') {
      patch.editorial_summary = shortText;
    }
    if (approvalType === 'lunga' || approvalType === 'tutto') {
      patch.descrizione_editoriale = longText;
      patch.descrizione_pubblica = longText;
    }
    if (approvalType === 'tutto') {
      patch.editorial_faq_items = normalizeFaqItems(preview.faq);
    }

    try {
      await updateGymRecord({ ...currentGym, ...patch });
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Errore durante la pubblicazione della preview.') });
    }

    await writeAdminAuditLog({
      action: 'CONTENT_APPROVE_EDITORIAL',
      recordId: params.id,
      beforeData: {
        descrizione_editoriale: currentGym.descrizione_editoriale,
        descrizione_pubblica: currentGym.descrizione_pubblica
      },
      afterData: patch
    }).catch(() => {});

    return {
      editorialPublished: {
        approval_type: approvalType,
        message:
          approvalType === 'breve'
            ? 'Descrizione breve approvata e pubblicata.'
            : approvalType === 'lunga'
              ? 'Descrizione lunga approvata e pubblicata.'
              : 'Descrizione breve, lunga e FAQ approvate e pubblicate.'
      }
    };
  }
};
