import { gymHref, primaryDisciplineForGym } from '$lib/gym-detail';

export const DELETED_AT_SQL = 'alter table gyms add column if not exists deleted_at timestamp with time zone null;';

export function archivedAt(gym) {
  return gym?.deleted_at || gym?.weekly_hours?._deleted_at || '';
}

export function isArchivedGym(gym) {
  return Boolean(archivedAt(gym));
}

export function isPremiumGym(gym) {
  return Boolean(gym?.is_premium || gym?.weekly_hours?._is_premium);
}

export function priorityScore(gym) {
  const value = Number(gym?.priority_score ?? gym?.weekly_hours?._priority_score ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function archiveGym(gym, date = new Date()) {
  const deletedAt = date.toISOString();
  return {
    ...gym,
    deleted_at: deletedAt,
    weekly_hours: {
      ...(gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {}),
      _deleted_at: deletedAt
    }
  };
}

export function restoreGym(gym) {
  const weeklyHours = {
    ...(gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {})
  };
  delete weeklyHours._deleted_at;

  return {
    ...gym,
    deleted_at: null,
    weekly_hours: weeklyHours
  };
}

export function duplicateGym(gym, id) {
  const weeklyHours = {
    ...(gym?.weekly_hours && typeof gym.weekly_hours === 'object' ? gym.weekly_hours : {})
  };
  delete weeklyHours._deleted_at;

  return {
    ...gym,
    id,
    name: `${gym?.name || 'Nuova palestra'} - copia`,
    deleted_at: null,
    weekly_hours: weeklyHours
  };
}

export function hasGenericDiscipline(gym) {
  const discipline = primaryDisciplineForGym(gym);
  return ['Fitness', 'Sport', 'Palestra'].includes(discipline);
}

export function hoursNeedReview(gym) {
  const hours = String(gym?.hours_info || '').trim();
  return !hours || /orari da verificare|da verificare/i.test(hours);
}

export function gymProblems(gym) {
  return {
    noPhone: !String(gym?.phone || '').trim(),
    noWebsite: !String(gym?.website || '').trim(),
    hoursToVerify: hoursNeedReview(gym),
    genericDiscipline: hasGenericDiscipline(gym)
  };
}

export function adminGymView(gym) {
  return {
    id: gym.id,
    name: gym.name || 'Senza nome',
    discipline: gym.discipline || primaryDisciplineForGym(gym),
    primaryDiscipline: primaryDisciplineForGym(gym),
    disciplines: Array.isArray(gym.disciplines) ? gym.disciplines : [],
    address: gym.address || '',
    address_display: [gym.address, gym.city].filter(Boolean).join(', '),
    city: gym.city || '',
    phone: gym.phone || '',
    hours_info: gym.hours_info || '',
    website: gym.website || '',
    description: gym.description || '',
    verified: Boolean(gym.verified || gym?.weekly_hours?._verified),
    premium: isPremiumGym(gym),
    priority_score: priorityScore(gym),
    archived: isArchivedGym(gym),
    deleted_at: archivedAt(gym),
    latitude: gym.latitude ?? '',
    longitude: gym.longitude ?? '',
    image_url: gym.image_url || '',
    publicHref: gymHref(gym),
    problems: gymProblems(gym)
  };
}

export function adminErrorMessage(err, fallback = 'Operazione non riuscita.') {
  const message = err?.message || String(err || '').trim();
  const details = err?.details || err?.hint || '';
  return [
    fallback,
    message ? `Dettaglio tecnico: ${message}` : '',
    details ? `Dettagli Supabase: ${details}` : '',
    'Suggerimento: controlla campi obbligatori, schema Supabase e permessi della service role key.'
  ]
    .filter(Boolean)
    .join(' ');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function gymsToAdminCsv(gyms) {
  const headers = [
    'id',
    'nome',
    'discipline',
    'indirizzo',
    'citta',
    'telefono',
    'orari',
    'sito',
    'descrizione',
    'lat',
    'lng',
    'is_premium',
    'is_verified',
    'priority_score'
  ];

  const rows = gyms.map((gym) => [
    gym.id,
    gym.name,
    Array.isArray(gym.disciplines) && gym.disciplines.length ? gym.disciplines.join(' | ') : gym.discipline,
    gym.address,
    gym.city,
    gym.phone,
    gym.hours_info,
    gym.website,
    gym.description,
    gym.latitude ?? '',
    gym.longitude ?? '',
    isPremiumGym(gym) ? '1' : '0',
    Boolean(gym.verified || gym?.weekly_hours?._verified) ? '1' : '0',
    priorityScore(gym)
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}
