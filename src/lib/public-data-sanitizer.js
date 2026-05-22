import { getSafePublicDescription } from './gym-description.js';

const CONTAMINATED_PUBLIC_GYM_FIXES = {
  'csv-210': {
    reason: 'Scheda con possibile contaminazione tra sedi First Studio.',
    fields: [
      'description',
      'descrizione',
      'descrizione_pubblica',
      'descrizione_editoriale',
      'descrizione_generata',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'meta_title',
      'meta_description',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-496': {
    reason: 'Scheda con possibile contaminazione tra sedi PTROOM.',
    fields: [
      'description',
      'descrizione',
      'descrizione_pubblica',
      'descrizione_editoriale',
      'descrizione_generata',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'meta_title',
      'meta_description',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-497': {
    reason: 'Scheda con possibile contaminazione tra sedi PTROOM.',
    fields: [
      'description',
      'descrizione',
      'descrizione_pubblica',
      'descrizione_editoriale',
      'descrizione_generata',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'meta_title',
      'meta_description',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
  'csv-499': {
    reason: 'Scheda con possibile contaminazione tra sedi PTROOM.',
    fields: [
      'description',
      'descrizione',
      'descrizione_pubblica',
      'descrizione_editoriale',
      'descrizione_generata',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'meta_title',
      'meta_description',
      'price_info',
      'price_source_url',
      'price_updated_at',
      'enrichment_status',
      'enrichment_notes',
      'enrichment_updated_at'
    ]
  },
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

const CITY_MISMATCH_FIELDS = [
  'description',
  'descrizione',
  'descrizione_pubblica',
  'descrizione_editoriale',
  'descrizione_generata',
  'editorial_summary',
  'editorial_highlights',
  'editorial_faq_items',
  'meta_title',
  'meta_description',
  'price_info'
];

const KNOWN_LOCAL_CITIES = [
  'Busto Arsizio',
  'Gallarate',
  'Varese',
  'Rozzano',
  'Chiasso',
  'Lugano',
  'Locarno',
  'Bellinzona',
  'Mendrisio',
  'Massagno',
  'Losone'
];

const KNOWN_SUSPICIOUS_ADDRESSES = [
  'Via Torino 48',
  'Viale G. Borri 78',
  'Viale Giovan Battista Borri 78',
  'Via Vincenzo Vela 5'
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

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function stringifyPublicValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'object' && item ? Object.values(item).join(' ') : item))
      .join(' ');
  }

  if (value && typeof value === 'object') {
    return Object.values(value).join(' ');
  }

  return clean(value);
}

function valuesFromPublicBlock(value) {
  if (Array.isArray(value)) return value.flatMap((item) => valuesFromPublicBlock(item));
  if (value && typeof value === 'object') return Object.values(value).flatMap((item) => valuesFromPublicBlock(item));
  return [clean(value)].filter(Boolean);
}

function urlValuesFromPublicBlock(value) {
  return valuesFromPublicBlock(value).filter((item) => /^https?:\/\//i.test(item));
}

function streetKey(value) {
  const normalized = normalizeForMatch(value)
    .replace(/\b\d{4,5}\b/g, ' ')
    .replace(/\b\d+[a-z]?\b/g, ' ')
    .replace(/\b(italia|svizzera|ch|co|va|ti)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = normalized.match(/\b(via|viale|piazza|corso|strada)\s+([a-z0-9.' -]{3,80})/);
  if (!match) return '';
  return `${match[1]} ${match[2]}`
    .replace(/\b(ingresso|da|presso|c\/o)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function blockTextForValidation(value) {
  return valuesFromPublicBlock(value).join(' ');
}

function detectedCityMismatch(gym) {
  const ownCity = normalizeForMatch(gym?.city || gym?.citta);
  if (!ownCity) return '';

  const text = CITY_MISMATCH_FIELDS.map((field) => stringifyPublicValue(gym?.[field])).join(' ');
  const normalizedText = normalizeForMatch(text);
  if (!normalizedText) return '';

  const ownName = normalizeForMatch(gym?.name || gym?.nome);
  const ownAddress = normalizeForMatch(gym?.address || gym?.indirizzo);

  for (const city of KNOWN_LOCAL_CITIES) {
    const normalizedCity = normalizeForMatch(city);
    if (!normalizedCity || normalizedCity === ownCity) continue;
    if (ownName.includes(normalizedCity) || ownAddress.includes(normalizedCity)) continue;
    if (normalizedText.includes(normalizedCity)) {
      return `Testo pubblico oscurato: cita ${city}, diverso dalla città scheda.`;
    }
  }

  return '';
}

export function publicGymBlockIssue(gym, block) {
  const text = blockTextForValidation(block);
  const normalizedText = normalizeForMatch(text);
  if (!normalizedText) return '';

  const ownCity = normalizeForMatch(gym?.city || gym?.citta);
  const ownName = normalizeForMatch(gym?.name || gym?.nome);
  const ownAddress = normalizeForMatch(gym?.address || gym?.indirizzo);
  const ownStreetKey = streetKey(gym?.address || gym?.indirizzo);
  const websiteHost = hostForUrl(gym?.website || gym?.sito);

  for (const city of KNOWN_LOCAL_CITIES) {
    const normalizedCity = normalizeForMatch(city);
    if (!normalizedCity || normalizedCity === ownCity) continue;
    if (ownName.includes(normalizedCity) || ownAddress.includes(normalizedCity)) continue;
    if (normalizedText.includes(normalizedCity)) return 'city_mismatch';
  }

  for (const address of KNOWN_SUSPICIOUS_ADDRESSES) {
    const normalizedAddress = normalizeForMatch(address);
    if (!normalizedAddress || ownAddress.includes(normalizedAddress)) continue;
    if (normalizedText.includes(normalizedAddress)) return 'address_mismatch';
  }

  const blockStreetKey = streetKey(text);
  if (blockStreetKey && ownStreetKey && blockStreetKey !== ownStreetKey && !ownStreetKey.includes(blockStreetKey)) {
    return 'address_mismatch';
  }

  if (/\b(sede|studio|club)\s+di\s+/i.test(text)) {
    for (const city of KNOWN_LOCAL_CITIES) {
      const normalizedCity = normalizeForMatch(city);
      if (!normalizedCity || normalizedCity === ownCity) continue;
      if (normalizedText.includes(`sede di ${normalizedCity}`)) return 'branch_mismatch';
    }
  }

  const sourceName = clean(block?.source_name || block?.sourceName || block?.fonte_ufficiale || block?.source);
  if (sourceName) {
    const normalizedSourceName = normalizeForMatch(sourceName);
    const sourceTokens = normalizedSourceName.split(/\s+/).filter((token) => token.length > 3);
    const nameHasToken = sourceTokens.some((token) => ownName.includes(token));
    const sourceHasToken = normalizeForMatch(gym?.sito || gym?.website).includes(normalizedSourceName);
    if (sourceTokens.length && !nameHasToken && !sourceHasToken) return 'source_name_mismatch';
  }

  for (const url of urlValuesFromPublicBlock(block)) {
    const sourceHost = hostForUrl(url);
    if (websiteHost && sourceHost && sourceHost !== websiteHost) return 'source_url_mismatch';
  }

  return '';
}

export function isSafePublicGymBlock(gym, block) {
  return !publicGymBlockIssue(gym, block);
}

export function filterSafePublicGymBlocks(gym, blocks = []) {
  return Array.isArray(blocks) ? blocks.filter((block) => isSafePublicGymBlock(gym, block)) : [];
}

function quarantinePublicEditorialFields(gym, reason, fields = UNSAFE_EDITORIAL_FIELDS) {
  const sanitized = { ...gym };
  const safeDescription = clean(gym?.safe_public_description) || getSafePublicDescription(gym);
  const publicReason = 'Alcuni dettagli della scheda sono in fase di verifica.';
  const publicFlag = reason
    ? [
        {
          type: 'public_data_quarantine',
          severity: 'high',
          reason: publicReason
        }
      ]
    : [];

  for (const field of fields) {
    sanitized[field] = emptyValueForField(field);
  }

  sanitized.description = safeDescription;
  sanitized.descrizione = safeDescription;
  sanitized.descrizione_pubblica = safeDescription;
  sanitized.descrizione_generata = '';
  sanitized.descrizione_editoriale = '';
  sanitized.descrizione_source = 'fallback_sicuro';
  sanitized.descrizione_needs_review = true;
  sanitized.needs_review = true;
  sanitized.review_reason = publicReason;
  sanitized.data_quality_flags = publicFlag;

  if (sanitized.weekly_hours && typeof sanitized.weekly_hours === 'object') {
    sanitized.weekly_hours = {
      ...sanitized.weekly_hours,
      _public_data_quarantine: publicReason,
      _needs_review: true
    };
  } else {
    sanitized.weekly_hours = {
      _public_data_quarantine: publicReason,
      _needs_review: true
    };
  }

  return sanitized;
}

export function sanitizePublicGymData(gym) {
  if (!gym) return gym;

  const fix = CONTAMINATED_PUBLIC_GYM_FIXES[String(gym.id || '')];
  const mismatchReason = unsafeEditorialSourceReason(gym);
  const cityMismatchReason = detectedCityMismatch(gym);
  const flaggedReason = gym?.needs_review
    ? clean(gym?.review_reason) || 'Scheda marcata come da revisionare dopo audit qualità dati.'
    : '';

  if (cityMismatchReason) {
    return quarantinePublicEditorialFields(gym, cityMismatchReason, [
      ...new Set([...UNSAFE_EDITORIAL_FIELDS, ...CITY_MISMATCH_FIELDS])
    ]);
  }

  if (flaggedReason) {
    return quarantinePublicEditorialFields(gym, flaggedReason, [
      ...new Set([...UNSAFE_EDITORIAL_FIELDS, ...CITY_MISMATCH_FIELDS])
    ]);
  }

  if (!fix && !mismatchReason) return gym;

  const fields = fix?.fields || UNSAFE_EDITORIAL_FIELDS;
  return quarantinePublicEditorialFields(gym, fix?.reason || mismatchReason, fields);
}
