const CONTAMINATED_PUBLIC_GYM_FIXES = {
  'csv-165': {
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
    reason: 'Campi editoriali oscurati dopo audit qualità dati.',
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
