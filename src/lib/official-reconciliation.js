const FIELD_LABELS = {
  nome: 'Nome',
  citta: 'Citta',
  indirizzo: 'Indirizzo',
  telefono: 'Telefono',
  email: 'Email',
  sito: 'Sito',
  discipline: 'Discipline',
  orari: 'Orari',
  prezzi: 'Prezzi',
  descrizione: 'Descrizione',
  storia: 'Storia',
  staff: 'Staff',
  social: 'Social'
};

const STATUS_LABELS = {
  confirmed: 'confermato',
  new_from_official: 'nuovo dalla fonte ufficiale',
  conflict: 'conflitto',
  missing_on_official: 'non trovato sulla fonte ufficiale',
  app_only: 'solo scheda',
  official_unclear: 'fonte ufficiale poco chiara',
  not_found: 'non trovato'
};

const ACTION_LABELS = {
  keep_app: 'mantieni',
  suggest_update: 'suggerisci update',
  use_for_editorial: 'usa per editoriale',
  needs_manual_review: 'review manuale',
  ignore: 'ignora'
};

const MENU_OR_FOOTER_RE =
  /\b(skip to content|top menu|menu|footer|header|cookie|privacy|copyright|powered by|all rights reserved|navigation|navigazione)\b/i;
const PROMO_PRICE_RE = /\b(gratis|promo|promozione|offerta|sconto|black friday|coupon|solo oggi)\b/i;
const SOCIAL_RE = /\b(instagram|facebook|linkedin|youtube|tiktok|whatsapp)\b/i;

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizePhone(value) {
  return clean(value).replace(/\D/g, '');
}

function normalizeHost(value) {
  try {
    return new URL(clean(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return fold(value).replace(/^www\./, '');
  }
}

function normalizeText(value) {
  return fold(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

function tokenOverlap(left, right) {
  const a = new Set(words(left).filter((word) => word.length > 2));
  const b = new Set(words(right).filter((word) => word.length > 2));
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const token of a) {
    if (b.has(token)) hits += 1;
  }
  return hits / Math.min(a.size, b.size);
}

function valuesFromFacts(facts, key) {
  const items = Array.isArray(facts?.[key]) ? facts[key] : [];
  return items.map((item) => clean(item?.value || item)).filter(Boolean);
}

function structuredItems(factsJson, key, predicate = () => true) {
  const items = Array.isArray(factsJson?.[key]) ? factsJson[key] : [];
  return items.filter((item) => item && predicate(item)).map((item) => ({ ...item, value: clean(item.value || item) })).filter((item) => item.value);
}

function structuredValues(factsJson, key, predicate) {
  return structuredItems(factsJson, key, predicate).map((item) => item.value);
}

function confidenceFromItems(items) {
  if (items.some((item) => item?.confidence === 'high')) return 'high';
  if (items.some((item) => item?.confidence === 'medium')) return 'medium';
  return items.length ? 'low' : 'low';
}

function confidenceFromFacts(facts, key) {
  const items = Array.isArray(facts?.[key]) ? facts[key] : [];
  return confidenceFromItems(items);
}

function appValue(gym, keys) {
  for (const key of keys) {
    const value = gym?.[key];
    if (Array.isArray(value) && value.length) return value.map(clean).filter(Boolean).join(' | ');
    if (clean(value)) return clean(value);
  }
  return '';
}

function appDisciplines(gym) {
  if (Array.isArray(gym?.disciplines) && gym.disciplines.length) return gym.disciplines.map(clean).filter(Boolean).join(' | ');
  return appValue(gym, ['discipline', 'disciplina', 'disciplina_principale', 'discipline_text']);
}

function appSocial(gym) {
  return [
    gym?.instagram,
    gym?.facebook,
    gym?.linkedin,
    gym?.youtube,
    gym?.tiktok,
    gym?.social_url,
    gym?.social
  ]
    .map(clean)
    .filter(Boolean)
    .join(' | ');
}

function officialText(facts) {
  return clean(
    facts?.clean_text ||
      valuesFromFacts(facts, 'source_highlights')
        .concat(valuesFromFacts(facts, 'organization_history'))
        .join(' ')
  );
}

function schemaOrgText(factsJson) {
  return structuredValues(factsJson, 'schema_org').join(' ');
}

function officialStructuredText(factsJson) {
  return [
    schemaOrgText(factsJson),
    ...structuredValues(factsJson, 'about'),
    ...structuredValues(factsJson, 'courses'),
    ...structuredValues(factsJson, 'addresses')
  ].join(' ');
}

function hasIncompatibleCity(value, gym) {
  const appCity = appValue(gym, ['citta', 'city']);
  if (!appCity || !value) return false;
  const normalized = normalizeText(value);
  if (normalized.includes(normalizeText(appCity))) return false;
  const knownCity = normalizeText(appCity);
  return /\b(varese|lugano|busto arsizio|gallarate|saronno|bellinzona|locarno|mendrisio|tradate|luino|como|milano)\b/i.test(value) && !normalized.includes(knownCity);
}

function suspiciousOfficialValue(value, gym, field) {
  const text = clean(value);
  if (!text) return 'Valore ufficiale assente.';
  if (MENU_OR_FOOTER_RE.test(text)) return 'Il valore sembra contenere menu, footer o testo tecnico.';
  if (hasIncompatibleCity(text, gym)) return 'Il valore cita una citta incompatibile con la scheda.';
  const appName = appValue(gym, ['nome', 'name']);
  if (field !== 'nome' && appName && /\b(palestra|gym|centro|club|studio|academy|asd)\b/i.test(text) && tokenOverlap(appName, text) < 0.35) {
    return 'Il valore potrebbe citare un altro centro o una fonte ambigua.';
  }
  if (field === 'prezzi' && PROMO_PRICE_RE.test(text)) return 'Prezzo o promozione non abbastanza stabile per uso automatico.';
  return '';
}

function hasSevereFactWarning(item, field) {
  const warning = clean(item?.warning);
  if (!warning) return false;
  if (/menu|footer|privacy|cookie|copyright|altra palestra|altro centro|citta incompatibile|fonte ambigua|promozione|non abbastanza stabile/i.test(warning)) {
    return true;
  }
  if (field === 'prezzi') return true;
  return false;
}

function usableStructuredItems(factsJson, key, field, predicate = () => true) {
  return structuredItems(factsJson, key, predicate).filter((item) => item.confidence !== 'low' && !hasSevereFactWarning(item, field));
}

function compareValues(field, app, official, confidence, gym, options = {}) {
  const appText = clean(app);
  const officialTextValue = clean(official);
  const suspicious = suspiciousOfficialValue(officialTextValue, gym, field);

  if (!appText && !officialTextValue) {
    return row(field, '', '', 'not_found', 'low', 'ignore', 'Dato assente sia nella scheda sia nella fonte ufficiale.');
  }

  if (officialTextValue && suspicious) {
    return row(field, appText, officialTextValue, 'official_unclear', 'low', 'needs_manual_review', suspicious);
  }

  if (!appText && officialTextValue) {
    const status = confidence === 'low' ? 'official_unclear' : 'new_from_official';
    const action = confidence === 'low' ? 'needs_manual_review' : options.editorialOnly ? 'use_for_editorial' : 'suggest_update';
    return row(field, '', officialTextValue, status, confidence, action, 'La fonte ufficiale contiene un dato non presente nella scheda.');
  }

  if (appText && !officialTextValue) {
    const status = options.officialHadContent ? 'missing_on_official' : 'app_only';
    const action = field === 'prezzi' ? 'needs_manual_review' : 'keep_app';
    return row(field, appText, '', status, options.officialHadContent ? 'medium' : 'low', action, 'Dato presente nella scheda ma non rilevato nella fonte ufficiale.');
  }

  const matched = options.matcher ? options.matcher(appText, officialTextValue) : tokenOverlap(appText, officialTextValue) >= 0.72;
  if (matched) {
    return row(field, appText, officialTextValue, 'confirmed', confidence === 'low' ? 'medium' : confidence, 'keep_app', 'Il dato della scheda e quello ufficiale risultano compatibili.');
  }

  return row(field, appText, officialTextValue, 'conflict', 'medium', 'needs_manual_review', 'Dato della scheda e fonte ufficiale non coincidono.');
}

function row(field, app_value, official_value, status, confidence, suggested_action, reason) {
  return {
    field,
    field_label: FIELD_LABELS[field] || field,
    app_value,
    official_value,
    status,
    status_label: STATUS_LABELS[status] || status,
    confidence,
    suggested_action,
    suggested_action_label: ACTION_LABELS[suggested_action] || suggested_action,
    reason
  };
}

function rowWithFacts(field, app_value, official_value, status, confidence, suggested_action, reason, source_facts = []) {
  return { ...row(field, app_value, official_value, status, confidence, suggested_action, reason), source_facts };
}

function compareStructuredValues(field, app, items, gym, options = {}) {
  const appText = clean(app);
  const officialTextValue = firstOrJoined([...new Set(items.map((item) => item.value))], options.maxValues || 5);
  const confidence = confidenceFromItems(items);
  const sourceFacts = items;
  const officialHadContent = Boolean(options.officialHadContent);
  const suspicious = suspiciousOfficialValue(officialTextValue, gym, field);

  if (!appText && !officialTextValue) {
    return rowWithFacts(field, '', '', 'not_found', 'low', 'ignore', 'Dato assente sia nella scheda sia nei facts strutturati.', sourceFacts);
  }

  if (officialTextValue && (suspicious || items.some((item) => hasSevereFactWarning(item, field)))) {
    return rowWithFacts(
      field,
      appText,
      officialTextValue,
      'official_unclear',
      'low',
      'needs_manual_review',
      suspicious || 'Uno o piu facts hanno warning grave o non sono abbastanza affidabili.',
      sourceFacts
    );
  }

  if (!appText && officialTextValue) {
    const status = confidence === 'low' ? 'official_unclear' : 'new_from_official';
    const action = confidence === 'low' ? 'needs_manual_review' : options.editorialOnly ? 'use_for_editorial' : 'suggest_update';
    return rowWithFacts(field, '', officialTextValue, status, confidence, action, 'Fact strutturato presente nella fonte ufficiale e assente nella scheda.', sourceFacts);
  }

  if (appText && !officialTextValue) {
    return rowWithFacts(field, appText, '', 'app_only', officialHadContent ? 'medium' : 'low', 'keep_app', 'Dato presente nella scheda e non contraddetto dai facts ufficiali.', sourceFacts);
  }

  const matched = options.matcher ? options.matcher(appText, officialTextValue) : tokenOverlap(appText, officialTextValue) >= 0.72;
  if (matched) {
    return rowWithFacts(field, appText, officialTextValue, 'confirmed', confidence === 'low' ? 'medium' : confidence, 'keep_app', 'Dato scheda e fact ufficiale risultano compatibili.', sourceFacts);
  }

  return rowWithFacts(field, appText, officialTextValue, 'conflict', 'medium', 'needs_manual_review', 'Dato scheda e fact ufficiale non coincidono.', sourceFacts);
}

function firstOrJoined(values, max = 3) {
  return values.slice(0, max).join(' | ');
}

function confidenceRank(value) {
  return { high: 3, medium: 2, low: 1 }[value] || 0;
}

function eligibleForEditorial(item) {
  if (item.status === 'conflict' || item.status === 'official_unclear') return false;
  if (item.status === 'app_only') return true;
  if (item.confidence === 'low') return false;
  if ((item.source_facts || []).some((fact) => hasSevereFactWarning(fact, item.field))) return false;
  if (item.status === 'confirmed') return true;
  if (item.status === 'new_from_official' && confidenceRank(item.confidence) >= 2) return true;
  return false;
}

function asEditorialFact(item) {
  return {
    field: item.field,
    label: item.field_label || FIELD_LABELS[item.field] || item.field,
    value: item.app_value || item.official_value,
    app_value: item.app_value,
    official_value: item.official_value,
    status: item.status,
    status_label: item.status_label,
    confidence: item.confidence,
    suggested_action: item.suggested_action,
    reason: item.reason,
    source_facts: item.source_facts || []
  };
}

function finalizeReconciliation(rows, warnings = []) {
  const confirmed = rows.filter((item) => item.status === 'confirmed');
  const suggested = rows.filter((item) => item.status === 'new_from_official' && item.suggested_action === 'suggest_update');
  const conflicts = rows.filter((item) => item.status === 'conflict');
  const excluded = rows.filter((item) => !eligibleForEditorial(item));
  const editorialEligible = rows.filter(eligibleForEditorial);
  const needsReview = conflicts.length > 0 || rows.some((item) => item.status === 'official_unclear');
  const averageConfidence =
    rows.reduce((sum, item) => sum + confidenceRank(item.confidence), 0) / Math.max(rows.filter((item) => item.status !== 'not_found').length, 1);
  const overallConfidence = averageConfidence >= 2.5 && !needsReview ? 'high' : averageConfidence >= 1.6 ? 'medium' : 'low';

  return {
    rows,
    confirmed,
    suggested,
    conflicts,
    excluded,
    editorial_eligible: editorialEligible,
    used_facts: editorialEligible.map(asEditorialFact),
    excluded_facts: excluded.map(asEditorialFact),
    needs_review: needsReview,
    overall_confidence: overallConfidence,
    warnings: [
      ...warnings,
      ...(conflicts.length ? ['Sono presenti conflitti: non generare editoriale prima della review.'] : []),
      ...(rows.some((item) => item.status === 'official_unclear') ? ['Alcuni facts ufficiali sono poco chiari o hanno warning gravi.'] : [])
    ]
  };
}

export function reconcileGymFacts(gym, factsJson = {}) {
  const officialHadContent = Boolean(Object.entries(factsJson || {}).some(([, value]) => Array.isArray(value) && value.length));
  const structuredText = officialStructuredText(factsJson);
  const schemaText = schemaOrgText(factsJson);
  const appName = appValue(gym, ['nome', 'name']);
  const appCity = appValue(gym, ['citta', 'city']);
  const contacts = usableStructuredItems(factsJson, 'contacts', 'telefono');
  const phones = contacts.filter((item) => item.type === 'phone');
  const emails = usableStructuredItems(factsJson, 'contacts', 'email', (item) => item.type === 'email');
  const addresses = usableStructuredItems(factsJson, 'addresses', 'indirizzo').filter((item) => item.source_section !== 'iframe_google_maps');
  const courses = usableStructuredItems(factsJson, 'courses', 'discipline');
  const schedules = usableStructuredItems(factsJson, 'schedules', 'orari');
  const prices = usableStructuredItems(factsJson, 'prices', 'prezzi');
  const about = usableStructuredItems(factsJson, 'about', 'storia');
  const social = usableStructuredItems(factsJson, 'social_links', 'social');
  const officialWebsite = clean(factsJson?.source_url || factsJson?.website || '');

  const rows = [
    compareStructuredValues('nome', appName, appName && schemaText.includes(appName) ? [{ value: appName, confidence: 'medium', source_section: 'schema_org' }] : [], gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.85
    }),
    compareStructuredValues('citta', appCity, appCity && structuredText.includes(appCity) ? [{ value: appCity, confidence: 'medium', source_section: 'facts_json' }] : [], gym, {
      officialHadContent,
      matcher: (app, official) => normalizeText(app) === normalizeText(official)
    }),
    compareStructuredValues('indirizzo', appValue(gym, ['indirizzo', 'address']), addresses, gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.6
    }),
    compareStructuredValues('telefono', appValue(gym, ['telefono', 'phone']), phones, gym, {
      officialHadContent,
      matcher: (app, official) => {
        const left = normalizePhone(app);
        const right = normalizePhone(official);
        return Boolean(left && right && (left.endsWith(right) || right.endsWith(left) || left === right));
      }
    }),
    compareStructuredValues('email', appValue(gym, ['email', 'mail']), emails, gym, {
      officialHadContent,
      matcher: (app, official) => fold(app) === fold(official) || fold(official).split('|').map(clean).includes(fold(app))
    }),
    compareStructuredValues('sito', appValue(gym, ['sito', 'website']), officialWebsite ? [{ value: officialWebsite, confidence: 'high', source_section: 'source_url' }] : [], gym, {
      officialHadContent,
      matcher: (app, official) => normalizeHost(app) === normalizeHost(official)
    }),
    compareStructuredValues('discipline', appDisciplines(gym), courses, gym, {
      officialHadContent,
      maxValues: 8,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.45
    }),
    compareStructuredValues('orari', appValue(gym, ['orari', 'hours_info', 'opening_hours']), schedules, gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.45
    }),
    compareStructuredValues('prezzi', appValue(gym, ['price_info', 'prezzi']), prices, gym, {
      officialHadContent
    }),
    compareStructuredValues('storia', '', about, gym, {
      officialHadContent,
      editorialOnly: true
    }),
    compareStructuredValues('social', appSocial(gym), social, gym, {
      officialHadContent,
      matcher: (app, official) => normalizeHost(app) === normalizeHost(official) || tokenOverlap(app, official) >= 0.55
    })
  ];

  return finalizeReconciliation(rows, factsJson?.warnings || []);
}

export function reconcileGymWithOfficialSource(gym, officialFacts = {}) {
  const facts = officialFacts?.facts ? { ...officialFacts.facts, ...officialFacts } : officialFacts;
  const text = officialText(facts);
  const officialHadContent = Boolean(text);

  const officialPhones = valuesFromFacts(facts, 'phones_found');
  const officialEmails = valuesFromFacts(facts, 'emails_found');
  const officialAddresses = valuesFromFacts(facts, 'addresses_found');
  const officialDisciplines = valuesFromFacts(facts, 'disciplines_found');
  const officialSchedules = valuesFromFacts(facts, 'schedules_found');
  const officialPrices = valuesFromFacts(facts, 'prices_found');
  const officialHistory = valuesFromFacts(facts, 'organization_history');
  const officialStaff = valuesFromFacts(facts, 'people_found');
  const officialSocial = valuesFromFacts(facts, 'social_found');
  const officialWebsite = clean(facts?.source_url || facts?.website || facts?.official_source_url);

  const rows = [
    compareValues('nome', appValue(gym, ['nome', 'name']), fold(text).includes(fold(appValue(gym, ['nome', 'name']))) ? appValue(gym, ['nome', 'name']) : '', 'medium', gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.85
    }),
    compareValues('citta', appValue(gym, ['citta', 'city']), fold(text).includes(fold(appValue(gym, ['citta', 'city']))) ? appValue(gym, ['citta', 'city']) : '', 'medium', gym, {
      officialHadContent,
      matcher: (app, official) => normalizeText(app) === normalizeText(official)
    }),
    compareValues('indirizzo', appValue(gym, ['indirizzo', 'address']), firstOrJoined(officialAddresses), confidenceFromFacts(facts, 'addresses_found'), gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.6
    }),
    compareValues('telefono', appValue(gym, ['telefono', 'phone']), firstOrJoined(officialPhones), confidenceFromFacts(facts, 'phones_found'), gym, {
      officialHadContent,
      matcher: (app, official) => {
        const left = normalizePhone(app);
        const right = normalizePhone(official);
        return Boolean(left && right && (left.endsWith(right) || right.endsWith(left) || left === right));
      }
    }),
    compareValues('email', appValue(gym, ['email', 'mail']), firstOrJoined(officialEmails), confidenceFromFacts(facts, 'emails_found'), gym, {
      officialHadContent,
      matcher: (app, official) => fold(app) === fold(official) || fold(official).split('|').map(clean).includes(fold(app))
    }),
    compareValues('sito', appValue(gym, ['sito', 'website']), officialWebsite, officialWebsite ? 'high' : 'low', gym, {
      officialHadContent,
      matcher: (app, official) => normalizeHost(app) === normalizeHost(official)
    }),
    compareValues('discipline', appDisciplines(gym), firstOrJoined(officialDisciplines, 8), confidenceFromFacts(facts, 'disciplines_found'), gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.45
    }),
    compareValues('orari', appValue(gym, ['orari', 'hours_info', 'opening_hours']), firstOrJoined(officialSchedules, 5), confidenceFromFacts(facts, 'schedules_found'), gym, {
      officialHadContent,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.45
    }),
    compareValues('prezzi', appValue(gym, ['price_info', 'prezzi']), firstOrJoined(officialPrices, 5), confidenceFromFacts(facts, 'prices_found'), gym, {
      officialHadContent
    }),
    compareValues('descrizione', appValue(gym, ['descrizione_pubblica', 'descrizione_editoriale', 'descrizione_generata', 'descrizione', 'description']), firstOrJoined(valuesFromFacts(facts, 'source_highlights'), 2), confidenceFromFacts(facts, 'source_highlights'), gym, {
      officialHadContent,
      editorialOnly: true,
      matcher: (app, official) => tokenOverlap(app, official) >= 0.35
    }),
    compareValues('storia', '', firstOrJoined(officialHistory, 2), confidenceFromFacts(facts, 'organization_history'), gym, {
      officialHadContent,
      editorialOnly: true
    }),
    compareValues('staff', appValue(gym, ['staff', 'team']), firstOrJoined(officialStaff, 5), confidenceFromFacts(facts, 'people_found'), gym, {
      officialHadContent,
      editorialOnly: true
    }),
    compareValues('social', appSocial(gym), firstOrJoined(officialSocial, 5), officialSocial.length ? 'medium' : 'low', gym, {
      officialHadContent,
      matcher: (app, official) => normalizeHost(app) === normalizeHost(official) || tokenOverlap(app, official) >= 0.55
    })
  ];

  return finalizeReconciliation(rows, officialFacts?.warnings || []);
}

export { ACTION_LABELS, FIELD_LABELS, STATUS_LABELS };
