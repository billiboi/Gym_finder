import { fail, redirect } from '@sveltejs/kit';
import { gymHref, slugifyGym } from '$lib/gym-detail';
import { adminErrorMessage, adminGymView, archiveGym as archiveGymRecord, hasGenericDiscipline, hoursNeedReview, isArchivedGym } from '$lib/admin/gyms';
import { dedupeDisciplines, normalizeDisciplineField } from '$lib/disciplines';
import { isCapLike, isSuspiciousZoneName } from '$lib/location-quality';
import { writeAdminAuditLog } from '$lib/server/admin-audit-store';
import { readClaimRequests } from '$lib/server/claim-request-store';
import { canWriteSupabase, readGyms, updateGymRecord, writeGymRecords } from '$lib/server/gym-store';

function clean(value) {
  return String(value ?? '').trim();
}

function fold(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateKey(gym, type) {
  const name = fold(gym?.name || gym?.nome);
  const city = fold(gym?.city || gym?.citta);
  const address = fold(gym?.address || gym?.indirizzo);
  const slug = clean(gym?.slug) || slugifyGym(gym);

  if (type === 'slug') return slug;
  if (type === 'name-city') return name && city ? `${name}|${city}` : '';
  if (type === 'name-address') return name && address ? `${name}|${address}` : '';
  return '';
}

function hasCoordinates(gym) {
  const lat = Number(gym?.latitude ?? gym?.lat);
  const lng = Number(gym?.longitude ?? gym?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function hasDescription(gym) {
  return Boolean(clean(gym?.description || gym?.descrizione || gym?.editorial_summary));
}

function hasCoverImage(gym) {
  return Boolean(clean(gym?.image_url || gym?.weekly_hours?._image_url));
}

function isVerified(gym) {
  return Boolean(gym?.is_verified || gym?.verified || gym?.weekly_hours?._verified);
}

function disciplineText(gym) {
  return Array.isArray(gym?.disciplines) && gym.disciplines.length
    ? gym.disciplines.join(' | ')
    : clean(gym?.discipline);
}

function normalizedDisciplinesForGym(gym) {
  return dedupeDisciplines(
    Array.isArray(gym?.disciplines) && gym.disciplines.length ? gym.disciplines : clean(gym?.discipline).split('|')
  );
}

function normalizedDisciplineMetadataForGym(gym) {
  return normalizeDisciplineField(
    Array.isArray(gym?.disciplines) && gym.disciplines.length ? gym.disciplines : clean(gym?.discipline).split('|'),
    ['Fitness']
  );
}

function needsDisciplineNormalization(gym) {
  const current = disciplineText(gym);
  const normalized = normalizedDisciplinesForGym(gym);
  return normalized.length > 0 && normalized.join(' | ') !== current;
}

function hasPlaceholderHours(gym) {
  const hours = clean(gym?.hours_info || gym?.orari);
  return !hours || /orari da verificare|da verificare|non disponibili|n\/d/i.test(hours);
}

function hasSuspiciousCity(gym) {
  return isSuspiciousZoneName(gym?.city || gym?.citta);
}

function hasContaminatedData(gym) {
  const fields = [
    gym?.name,
    gym?.address,
    gym?.city,
    gym?.phone,
    gym?.website,
    gym?.description,
    gym?.hours_info
  ].map(clean);

  return fields.some((value) =>
    /undefined|null|nan|\[object object\]|<script|coupon|casino|crypto|porn|escort/i.test(value)
  );
}

function descriptionText(gym) {
  return clean(
    gym?.description ||
      gym?.descrizione ||
      gym?.descrizione_pubblica ||
      gym?.descrizione_editoriale ||
      gym?.descrizione_generata ||
      gym?.editorial_summary
  );
}

function hasSafeFallbackDescription(gym) {
  const source = clean(gym?.descrizione_source || gym?.description_source);
  return Boolean(clean(gym?.safe_public_description) || source === 'fallback_sicuro');
}

function hasGenericDescription(gym) {
  const text = fold(descriptionText(gym));
  if (!text) return false;
  if (/^(palestra|palestra fitness|centro fitness|struttura sportiva|fitness)$/.test(text)) return true;
  return text.length < 120 && /\b(palestra|fitness|struttura sportiva)\b/.test(text);
}

function addressQualityIssues(gym) {
  const address = clean(gym?.address || gym?.indirizzo);
  const city = clean(gym?.city || gym?.citta);
  const description = descriptionText(gym);
  const issues = {
    shortAddress: false,
    entranceOnlyAddress: false,
    addressOnlyCity: false,
    addressWithoutStreet: false,
    addressWithoutNumber: false,
    addressDescriptionMismatch: false
  };

  if (!address) return issues;

  const foldedAddress = fold(address);
  const foldedDescription = fold(description);
  const streetWords = /\b(via|viale|piazza|corso|largo|strada|vicolo|contrada|salita|rue|route|avenue|place|strasse)\b/i;
  const ownStreet = foldedAddress
    .replace(fold(city), '')
    .replace(/\b\d+[a-z]?\b/g, '')
    .replace(/\b(italia|svizzera|suisse|schweiz)\b/g, '')
    .trim();

  issues.shortAddress = address.length < 8;
  issues.entranceOnlyAddress = /\bingresso\s+da\b/i.test(address);
  issues.addressOnlyCity = Boolean(city && foldedAddress === fold(city));
  issues.addressWithoutStreet = !streetWords.test(address);
  issues.addressWithoutNumber = streetWords.test(address) && !/\d/.test(address);
  issues.addressDescriptionMismatch =
    Boolean(description && streetWords.test(description) && ownStreet.length >= 5) &&
    !foldedDescription.includes(ownStreet.split(' ').slice(0, 3).join(' '));

  return issues;
}

function claimForGym(gym, claimIndex) {
  const id = clean(gym?.id);
  const slug = slugifyGym(gym);
  const name = fold(gym?.name || gym?.nome);

  return (
    (id && claimIndex.byGymId.get(id)) ||
    (slug && claimIndex.bySlug.get(slug)) ||
    (name && claimIndex.byName.get(name)) ||
    null
  );
}

function qualityFlags(gym, slugCounts, claimIndex) {
  const slug = clean(gym?.slug) || slugifyGym(gym);
  const claim = claimForGym(gym, claimIndex);
  const disciplines = normalizedDisciplinesForGym(gym);
  const noDisciplines = disciplines.length === 0;
  const genericDiscipline = hasGenericDiscipline(gym);
  const disciplineNeedsReview = noDisciplines || genericDiscipline || needsDisciplineNormalization(gym);
  const addressIssues = addressQualityIssues(gym);

  return {
    noName: !clean(gym?.name || gym?.nome),
    noAddress: !clean(gym?.address || gym?.indirizzo),
    noCity: !clean(gym?.city || gym?.citta),
    noPhone: !clean(gym?.phone || gym?.telefono),
    noWebsite: !clean(gym?.website || gym?.sito),
    noHours: hoursNeedReview(gym),
    placeholderHours: hasPlaceholderHours(gym),
    noCoordinates: !hasCoordinates(gym),
    noDescription: !hasDescription(gym),
    noDisciplines,
    missingPrimaryDiscipline: !clean(gym?.discipline) && !disciplines.length,
    genericDiscipline,
    disciplineNeedsReview,
    noImage: !hasCoverImage(gym),
    duplicateSlug: Boolean(slug && slugCounts.get(slug) > 1),
    unverified: !isVerified(gym),
    claimPending: Boolean(claim && ['pending', 'in_review'].includes(claim.status || 'pending')),
    claimApproved: Boolean(claim && claim.status === 'approved'),
    contaminatedData: hasContaminatedData(gym),
    suspiciousCity: hasSuspiciousCity(gym),
    suspiciousZone: hasSuspiciousCity(gym),
    capAsCity: isCapLike(gym?.city || gym?.citta),
    needsReview: Boolean(gym?.needs_review || gym?.descrizione_needs_review || gym?.description_needs_review),
    safeFallback: hasSafeFallbackDescription(gym),
    genericDescription: hasGenericDescription(gym),
    incompleteAddress: Object.values(addressIssues).some(Boolean),
    shortAddress: addressIssues.shortAddress,
    entranceOnlyAddress: addressIssues.entranceOnlyAddress,
    addressOnlyCity: addressIssues.addressOnlyCity,
    addressWithoutStreet: addressIssues.addressWithoutStreet,
    addressWithoutNumber: addressIssues.addressWithoutNumber,
    addressDescriptionMismatch: addressIssues.addressDescriptionMismatch
  };
}

function buildDuplicateGroups(gyms) {
  const groups = new Map();

  for (const type of ['slug', 'name-city', 'name-address']) {
    for (const gym of gyms) {
      const key = duplicateKey(gym, type);
      if (!key) continue;
      const groupKey = `${type}:${key}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, type, gyms: [] });
      groups.get(groupKey).gyms.push(gym);
    }
  }

  return [...groups.values()]
    .filter((group) => group.gyms.length > 1)
    .map((group) => ({
      ...group,
      label:
        group.type === 'slug'
          ? 'Slug duplicato'
          : group.type === 'name-city'
            ? 'Nome e città uguali'
            : 'Nome e indirizzo uguali',
      gyms: group.gyms.map((gym) => ({
        ...adminGymView(gym),
        publicHref: gymHref(gym)
      }))
    }))
    .sort((a, b) => b.gyms.length - a.gyms.length || a.label.localeCompare(b.label, 'it'));
}

function mergeIntoPrimary(primary, secondary) {
  const mergedDisciplines = dedupeDisciplines([
    ...(Array.isArray(primary?.disciplines) ? primary.disciplines : clean(primary?.discipline).split('|')),
    ...(Array.isArray(secondary?.disciplines) ? secondary.disciplines : clean(secondary?.discipline).split('|'))
  ]);

  const merged = { ...primary };
  const fillFields = [
    'phone',
    'telefono',
    'email',
    'website',
    'sito',
    'hours_info',
    'orari',
    'description',
    'descrizione',
    'latitude',
    'longitude',
    'lat',
    'lng',
    'official_source_url',
    'price_info',
    'price_source_url'
  ];

  for (const field of fillFields) {
    if (!clean(merged[field]) && clean(secondary?.[field])) merged[field] = secondary[field];
  }

  if (mergedDisciplines.length) {
    merged.disciplines = mergedDisciplines;
    merged.discipline = mergedDisciplines[0];
  }

  merged.weekly_hours = {
    ...(secondary?.weekly_hours && typeof secondary.weekly_hours === 'object' ? secondary.weekly_hours : {}),
    ...(primary?.weekly_hours && typeof primary.weekly_hours === 'object' ? primary.weekly_hours : {})
  };

  return merged;
}

function issueLabels(flags) {
  return [
    flags.noName ? 'Senza nome' : '',
    flags.noAddress ? 'Senza indirizzo' : '',
    flags.noCity ? 'Senza città' : '',
    flags.noPhone ? 'Senza telefono' : '',
    flags.noWebsite ? 'Senza sito' : '',
    flags.noHours ? 'Senza orari' : '',
    flags.placeholderHours ? 'Orari placeholder' : '',
    flags.noCoordinates ? 'Senza coordinate' : '',
    flags.noDescription ? 'Descrizione mancante' : '',
    flags.noDisciplines ? 'Senza discipline' : '',
    flags.missingPrimaryDiscipline ? 'Disciplina principale mancante' : '',
    flags.genericDiscipline ? 'Disciplina generica' : '',
    flags.disciplineNeedsReview ? 'Disciplina da verificare' : '',
    flags.noImage ? 'Senza copertina' : '',
    flags.duplicateSlug ? 'Slug duplicato' : '',
    flags.unverified ? 'Non verificata' : '',
    flags.claimPending ? 'Claim pending' : '',
    flags.contaminatedData ? 'Dati sospetti' : '',
    flags.suspiciousCity && !flags.suspiciousZone ? 'Città sospetta' : '',
    flags.suspiciousZone ? 'Zona sospetta' : '',
    flags.capAsCity ? 'CAP usato come città' : '',
    flags.needsReview ? 'Da revisionare' : '',
    flags.safeFallback ? 'Fallback sicuro' : '',
    flags.genericDescription ? 'Descrizione generica' : '',
    flags.shortAddress ? 'Indirizzo troppo corto' : '',
    flags.entranceOnlyAddress ? 'Indirizzo contiene ingresso da' : '',
    flags.addressOnlyCity ? 'Indirizzo solo città' : '',
    flags.addressWithoutStreet ? 'Indirizzo senza via' : '',
    flags.addressWithoutNumber ? 'Indirizzo senza numero civico' : '',
    flags.addressDescriptionMismatch ? 'Indirizzo incoerente con descrizione' : ''
  ].filter(Boolean);
}

function buildClaimIndex(requests) {
  const index = {
    byGymId: new Map(),
    bySlug: new Map(),
    byName: new Map()
  };

  for (const request of requests) {
    const gymId = clean(request?.gym_id);
    const url = clean(request?.gym_url);
    const slug = url.match(/\/palestre\/([^/?#]+)/)?.[1] || '';
    const name = fold(request?.gym_name);

    if (gymId && !index.byGymId.has(gymId)) index.byGymId.set(gymId, request);
    if (slug && !index.bySlug.has(slug)) index.bySlug.set(slug, request);
    if (name && !index.byName.has(name)) index.byName.set(name, request);
  }

  return index;
}

function scoreBand(score) {
  if (score < 40) return 'low';
  if (score <= 70) return 'medium';
  return 'high';
}

export async function load({ url }) {
  const gyms = await readGyms();
  const claims = await readClaimRequests();
  const claimIndex = buildClaimIndex(claims);
  const visibleGyms = gyms.filter((gym) => !isArchivedGym(gym));
  const slugCounts = new Map();
  const duplicateGroups = buildDuplicateGroups(visibleGyms);

  for (const gym of visibleGyms) {
    const slug = clean(gym?.slug) || slugifyGym(gym);
    if (!slug) continue;
    slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }

  const items = visibleGyms
    .map((gym) => {
      const view = adminGymView(gym);
      const flags = qualityFlags(gym, slugCounts, claimIndex);
      const issues = issueLabels(flags);
      const claim = claimForGym(gym, claimIndex);

      return {
        ...view,
        updated_at: clean(gym?.updated_at),
        publicHref: gymHref(gym),
        qualityFlags: flags,
        issueLabels: issues,
        issueCount: issues.length,
        qualityBand: scoreBand(view.data_quality_score),
        claim: claim
          ? {
              id: claim.id,
              status: claim.status || 'pending',
              requester: clean(claim.requester_name || claim.nome || claim.email || claim.requester_email),
              href: '/admin/richieste'
            }
          : null
      };
    })
    .sort((a, b) => {
      if (b.issueCount !== a.issueCount) return b.issueCount - a.issueCount;
      return a.name.localeCompare(b.name, 'it');
    });

  const stats = {
    all: items.length,
    noPhone: items.filter((item) => item.qualityFlags.noPhone).length,
    noWebsite: items.filter((item) => item.qualityFlags.noWebsite).length,
    noHours: items.filter((item) => item.qualityFlags.noHours).length,
    placeholderHours: items.filter((item) => item.qualityFlags.placeholderHours).length,
    noCoordinates: items.filter((item) => item.qualityFlags.noCoordinates).length,
    noDescription: items.filter((item) => item.qualityFlags.noDescription).length,
    noImage: items.filter((item) => item.qualityFlags.noImage).length,
    genericDiscipline: items.filter((item) => item.qualityFlags.genericDiscipline).length,
    disciplineNeedsReview: items.filter((item) => item.qualityFlags.disciplineNeedsReview).length,
    duplicateSlug: items.filter((item) => item.qualityFlags.duplicateSlug).length,
    unverified: items.filter((item) => item.qualityFlags.unverified).length,
    claimPending: items.filter((item) => item.qualityFlags.claimPending).length,
    lowQuality: items.filter((item) => item.data_quality_score < 40).length,
    mediumQuality: items.filter((item) => item.data_quality_score >= 40 && item.data_quality_score <= 70).length,
    highQuality: items.filter((item) => item.data_quality_score > 70).length,
    contaminatedData: items.filter((item) => item.qualityFlags.contaminatedData).length,
    suspiciousCity: items.filter((item) => item.qualityFlags.suspiciousCity).length,
    suspiciousZone: items.filter((item) => item.qualityFlags.suspiciousZone).length,
    capAsCity: items.filter((item) => item.qualityFlags.capAsCity).length,
    needsReview: items.filter((item) => item.qualityFlags.needsReview).length,
    safeFallback: items.filter((item) => item.qualityFlags.safeFallback).length,
    genericDescription: items.filter((item) => item.qualityFlags.genericDescription).length,
    incompleteAddress: items.filter((item) => item.qualityFlags.incompleteAddress).length,
    probableDuplicateGroups: duplicateGroups.length,
    disciplineNormalization: visibleGyms.filter((gym) => needsDisciplineNormalization(gym)).length
  };

  return {
    gyms: items,
    stats,
    duplicateGroups: duplicateGroups.slice(0, 30),
    disciplineNormalizationCandidates: visibleGyms
      .filter((gym) => needsDisciplineNormalization(gym))
      .map((gym) => ({
        id: gym.id,
        name: clean(gym?.name || gym?.nome) || 'Senza nome',
        city: clean(gym?.city || gym?.citta),
        current: disciplineText(gym),
        normalized: normalizedDisciplinesForGym(gym).join(' | ')
      }))
      .slice(0, 80),
    persistentWrites: canWriteSupabase(),
    merged: url.searchParams.get('merged') === '1',
    normalized: url.searchParams.get('normalized') === '1',
    normalizedCount: Number(url.searchParams.get('normalized_count') || 0),
    verified: url.searchParams.get('verified') === '1',
    archived: url.searchParams.get('archived') === '1'
  };
}

export const actions = {
  mergeGyms: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Merge bloccato: questa azione deve scrivere su Supabase staging/preview e richiede SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    const form = await request.formData();
    const keepId = clean(form.get('keep_id'));
    const archiveId = clean(form.get('archive_id'));
    const confirmText = clean(form.get('confirm_text'));

    if (!keepId || !archiveId || keepId === archiveId) {
      return fail(400, { error: 'Seleziona due schede diverse da unire.' });
    }
    if (confirmText !== 'UNISCI') {
      return fail(400, { error: 'Merge bloccato: scrivi UNISCI per confermare.' });
    }

    const gyms = await readGyms();
    const primary = gyms.find((gym) => gym.id === keepId);
    const secondary = gyms.find((gym) => gym.id === archiveId);

    if (!primary || !secondary) return fail(404, { error: 'Una delle due schede non è stata trovata.' });
    if (isArchivedGym(primary) || isArchivedGym(secondary)) {
      return fail(400, { error: 'Il merge usa solo schede attive. Ripristina prima eventuali schede archiviate.' });
    }

    const mergedPrimary = mergeIntoPrimary(primary, secondary);
    const archivedSecondary = archiveGymRecord(secondary);

    try {
      await writeGymRecords([mergedPrimary, archivedSecondary]);
      await writeAdminAuditLog({
        action: 'QUALITY_MERGE',
        recordId: keepId,
        beforeData: { keep: primary, archive: secondary },
        afterData: { keep: mergedPrimary, archive: archivedSecondary }
      }).catch(() => {});
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Merge non riuscito.') });
    }

    throw redirect(303, '/admin/qualita?merged=1');
  },

  normalizeDisciplines: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Normalizzazione bloccata: questa azione deve scrivere su Supabase staging/preview e richiede SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    const form = await request.formData();
    const ids = clean(form.get('ids'))
      .split(',')
      .map((id) => clean(id))
      .filter(Boolean);
    const confirmText = clean(form.get('confirm_text'));

    if (!ids.length) return fail(400, { error: 'Seleziona almeno una scheda da normalizzare.' });
    if (confirmText !== 'NORMALIZZA') {
      return fail(400, { error: 'Normalizzazione bloccata: scrivi NORMALIZZA per confermare.' });
    }

    const selected = new Set(ids);
    const gyms = await readGyms();
    const changed = gyms
      .filter((gym) => selected.has(clean(gym.id)) && !isArchivedGym(gym) && needsDisciplineNormalization(gym))
      .map((gym) => {
        const metadata = normalizedDisciplineMetadataForGym(gym);
        const disciplines = metadata.disciplines;
        const weeklyHours = gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {};
        return {
          ...gym,
          discipline: disciplines[0] || gym.discipline || 'Fitness',
          disciplines: disciplines.length ? disciplines : gym.disciplines,
          discipline_aliases: metadata.aliases || [],
          discipline_canonical_slugs: metadata.slugs || [],
          weekly_hours: {
            ...weeklyHours,
            _discipline_aliases: metadata.aliases || [],
            _discipline_canonical_slugs: metadata.slugs || []
          }
        };
      });

    if (!changed.length) return fail(400, { error: 'Nessuna normalizzazione applicabile alle schede selezionate.' });

    try {
      for (const gym of changed) {
        await updateGymRecord(gym);
      }
      await writeAdminAuditLog({
        action: 'QUALITY_NORMALIZE_DISCIPLINES',
        recordId: changed.map((gym) => gym.id).join(','),
        beforeData: {
          ids,
          count: changed.length
        },
        afterData: {
          records: changed.map((gym) => ({
            id: gym.id,
            discipline: gym.discipline,
            disciplines: gym.disciplines
          }))
        }
      }).catch(() => {});
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Normalizzazione non riuscita.') });
    }

    throw redirect(303, `/admin/qualita?normalized=1&normalized_count=${changed.length}`);
  },

  verifyGym: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Verifica bloccata: questa azione deve scrivere su Supabase staging/preview e richiede SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    if (!id) return fail(400, { error: 'ID palestra mancante.' });

    const gyms = await readGyms();
    const gym = gyms.find((item) => clean(item.id) === id);
    if (!gym || isArchivedGym(gym)) return fail(404, { error: 'Scheda attiva non trovata.' });

    const changed = {
      ...gym,
      is_verified: true,
      verified: true,
      weekly_hours: {
        ...(gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {}),
        _verified: true
      }
    };

    try {
      await writeGymRecords([changed]);
      await writeAdminAuditLog({
        action: 'QUALITY_VERIFY_GYM',
        recordId: id,
        beforeData: { is_verified: gym.is_verified, verified: gym.verified },
        afterData: { is_verified: true, verified: true }
      }).catch(() => {});
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Verifica scheda non riuscita.') });
    }

    throw redirect(303, '/admin/qualita?verified=1');
  },

  archiveGym: async ({ request }) => {
    if (!canWriteSupabase()) {
      return fail(503, {
        error:
          'Archiviazione bloccata: questa azione deve scrivere su Supabase staging/preview e richiede SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    const form = await request.formData();
    const id = clean(form.get('id'));
    const confirmText = clean(form.get('confirm_text'));
    if (!id) return fail(400, { error: 'ID palestra mancante.' });
    if (confirmText !== 'ARCHIVIA') {
      return fail(400, { error: 'Archiviazione bloccata: scrivi ARCHIVIA per confermare.' });
    }

    const gyms = await readGyms();
    const gym = gyms.find((item) => clean(item.id) === id);
    if (!gym || isArchivedGym(gym)) return fail(404, { error: 'Scheda attiva non trovata.' });

    const changed = archiveGymRecord(gym);

    try {
      await writeGymRecords([changed]);
      await writeAdminAuditLog({
        action: 'QUALITY_ARCHIVE_GYM',
        recordId: id,
        beforeData: gym,
        afterData: changed
      }).catch(() => {});
    } catch (err) {
      return fail(500, { error: adminErrorMessage(err, 'Archiviazione scheda non riuscita.') });
    }

    throw redirect(303, '/admin/qualita?archived=1');
  }
};
