const CONTAMINATED_PUBLIC_GYM_FIXES = {
  'csv-165': {
    reason: 'Rimossi dati CrossFit Varese dalla scheda Curling Club Chiasso.',
    fields: [
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-413': {
    reason: 'Rimossi dati Good Life Academy dalla scheda Old School Fighting Lugano.',
    fields: [
      'website',
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-542': {
    reason: 'Rimossi dati SMASH X3 dalla scheda Societ Federale di Ginnastica Chiasso.',
    fields: [
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-173': {
    reason: 'Rimossi dati De Nittis Choy Lay Fut dalla scheda DeaYoga.',
    fields: [
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-364': {
    reason: 'Rimossi dati MADDYFIT dalla scheda Mangrove Academy.',
    fields: [
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-194': {
    reason: 'Rimossi dati Emotion Fitness dalla scheda Endless Will - Margherita Montes.',
    fields: [
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-606': {
    reason: 'Rimossi dati TC Lugano 1903 dalla scheda Team Kimura Ticino.',
    fields: [
      'description',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  }
};

const UNSAFE_EDITORIAL_FIELDS = [
  'official_source_url',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'price_info',
  'price_source_url',
  'price_updated_at',
  'enrichment_status',
  'enrichment_notes',
  'enrichment_updated_at'
];

function hostForUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function unsafeEditorialSourceReason(gym) {
  const websiteHost = hostForUrl(gym?.website || gym?.sito);
  const sourceHost = hostForUrl(gym?.official_source_url);

  if (!websiteHost || !sourceHost || websiteHost === sourceHost) return '';
  return `Fonte editoriale oscurata: dominio fonte ${sourceHost} diverso dal sito scheda ${websiteHost}.`;
}

function emptyValueForField(field) {
  if (field === 'editorial_highlights' || field === 'editorial_faq_items') return [];
  if (field === 'enrichment_status') return 'pending';
  if (field === 'price_updated_at' || field === 'enrichment_updated_at') return null;
  return '';
}

export function sanitizePublicGymData(gym) {
  if (!gym) return gym;

  const fix = CONTAMINATED_PUBLIC_GYM_FIXES[String(gym.id || '')];
  const mismatchReason = unsafeEditorialSourceReason(gym);

  if (!fix && !mismatchReason) return gym;

  const sanitized = { ...gym };
  const fields = fix?.fields || UNSAFE_EDITORIAL_FIELDS;

  for (const field of fields) {
    sanitized[field] = emptyValueForField(field);
  }

  if (sanitized.weekly_hours && typeof sanitized.weekly_hours === 'object') {
    sanitized.weekly_hours = {
      ...sanitized.weekly_hours,
      _public_data_quarantine: fix?.reason || mismatchReason
    };
  }

  return sanitized;
}
