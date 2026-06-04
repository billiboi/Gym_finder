const LEVEL_LABELS = {
  A: 'pronto per revisione',
  B: 'buono, controllare dettagli',
  C: 'fallback sicuro'
};

const FORBIDDEN_COPY_RE =
  /\b(miglior[ei]?|leader|professionisti qualificati|esperienza unica|a 360 gradi|nel mondo moderno|eccellenza|top|imperdibile)\b/i;
const PRICE_OR_PROMO_RE = /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|chf|eur|euro|gratis|promo|promozione|offerta|sconto)\b/i;

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fold(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function fieldRow(report, field) {
  return (report?.rows || report?.reconciliation?.rows || []).find((row) => row.field === field) || null;
}

function safeRows(report) {
  const rows = report?.editorial_eligible || report?.reconciliation?.editorial_eligible || [];
  return rows.filter((row) => {
    if (row.status === 'conflict' || row.status === 'official_unclear') return false;
    if (row.status === 'app_only') return true;
    return row.confidence !== 'low';
  });
}

function safeRow(report, field) {
  return safeRows(report).find((row) => row.field === field) || null;
}

function valueFor(gym, report, field, keys = []) {
  const row = safeRow(report, field);
  if (row?.official_value && row.status === 'new_from_official') return clean(row.official_value);
  if (row?.app_value) return clean(row.app_value);
  if (row?.official_value && row.status === 'confirmed') return clean(row.official_value);
  for (const key of keys) {
    const value = gym?.[key];
    if (Array.isArray(value) && value.length) return value.map(clean).filter(Boolean).join(', ');
    if (clean(value)) return clean(value);
  }
  return '';
}

function disciplineOf(gym, report) {
  const value = valueFor(gym, report, 'discipline', ['disciplines', 'discipline', 'disciplina', 'disciplina_principale']);
  return clean(value.split('|')[0] || value.split(',')[0] || value || 'Fitness');
}

function contactOf(gym, report) {
  const phone = valueFor(gym, report, 'telefono', ['telefono', 'phone']);
  const site = valueFor(gym, report, 'sito', ['sito', 'website']);
  if (phone) return { label: 'telefono', value: phone };
  if (site) return { label: 'sito ufficiale', value: site };
  return { label: '', value: '' };
}

function detectTemplate(gym, discipline) {
  const text = fold(`${gym?.nome || gym?.name || ''} ${discipline} ${Array.isArray(gym?.disciplines) ? gym.disciplines.join(' ') : ''}`);
  const disciplineCount = Array.isArray(gym?.disciplines) ? gym.disciplines.length : clean(gym?.discipline || '').split('|').filter(Boolean).length;
  if (disciplineCount > 2) return 'multidisciplina';
  if (/\b(crossfit|wod)\b/.test(text)) return 'crossfit';
  if (/\b(yoga|pilates)\b/.test(text)) return 'yoga_pilates';
  if (/\b(personal|personal training|trainer)\b/.test(text)) return 'personal_training';
  if (/\b(fitactive|activ fitness|anytime|mcfit|20 training lab|nonstopgym)\b/.test(text)) return 'catena_sede';
  if (/\b(judo|karate|taekwondo|boxe|kickboxing|muay thai|mma|krav maga|wing chun|aikido|bjj|arti marziali|difesa personale)\b/.test(text)) {
    return 'arti_marziali';
  }
  if (/\b(fitness|palestra|funzionale|calisthenics)\b/.test(text)) return 'fitness';
  return 'scheda_povera';
}

function hasConflict(report) {
  return Boolean((report?.conflicts || report?.reconciliation?.conflicts || []).length);
}

function hasUnclearOfficialData(report) {
  const rows = report?.rows || report?.reconciliation?.rows || [];
  return rows.some((row) => row.status === 'official_unclear');
}

function sourceUseful(report) {
  return ['descrizione', 'storia', 'discipline', 'telefono', 'email', 'indirizzo', 'sito'].some((field) => {
    const row = safeRow(report, field);
    return row && (row.status === 'confirmed' || row.status === 'new_from_official');
  });
}

function decideLevel(gym, report, data) {
  const completeCore = Boolean(data.name && data.city && data.address && data.discipline && data.contact.value);
  const hasMaterial = Boolean(data.history || safeRow(report, 'descrizione') || safeRow(report, 'discipline'));
  if (hasConflict(report)) return 'C';
  if (completeCore && sourceUseful(report) && hasMaterial) return 'A';
  if (data.name && data.city && data.discipline && sourceUseful(report)) return 'B';
  return 'C';
}

function sentence(parts) {
  return clean(parts.filter(Boolean).join(' ')).replace(/\s+([,.])/g, '$1');
}

function templateIntro(kind, level, data) {
  const { name, city, discipline } = data;
  if (level === 'C') {
    return `${name} e' una scheda sportiva presente a ${city || 'citta da verificare'} e collegata a ${discipline}.`;
  }

  const variants = {
    arti_marziali:
      level === 'A'
        ? `${name} e' una scuola di ${discipline} a ${city}.`
        : `${name} e' una realta sportiva di ${city} dedicata a ${discipline}.`,
    fitness:
      level === 'A'
        ? `${name} e' una palestra a ${city} con attivita legate a ${discipline}.`
        : `${name} e' una struttura sportiva di ${city} collegata a ${discipline}.`,
    crossfit:
      level === 'A'
        ? `${name} e' un box CrossFit a ${city}.`
        : `${name} e' una realta di ${city} dedicata a CrossFit e allenamento funzionale.`,
    yoga_pilates:
      level === 'A'
        ? `${name} e' uno spazio a ${city} dedicato a ${discipline}.`
        : `${name} e' una struttura di ${city} collegata a percorsi di ${discipline}.`,
    personal_training:
      level === 'A'
        ? `${name} e' uno studio di personal training a ${city}.`
        : `${name} e' una scheda di ${city} collegata al personal training.`,
    multidisciplina:
      level === 'A'
        ? `${name} e' una struttura multidisciplina a ${city}.`
        : `${name} raccoglie a ${city} attivita collegate a ${discipline}.`,
    catena_sede:
      level === 'A'
        ? `${name} e' una sede a ${city} collegata a ${discipline}.`
        : `${name} e' una sede sportiva di ${city} con attivita legate a ${discipline}.`,
    scheda_povera: `${name} e' una scheda sportiva presente a ${city || 'citta da verificare'} e collegata a ${discipline}.`
  };
  return variants[kind] || variants.scheda_povera;
}

function buildShort(kind, level, data) {
  if (level === 'C') {
    return sentence([
      templateIntro(kind, level, data),
      'Le informazioni disponibili permettono di identificare la struttura, mentre alcuni dettagli possono richiedere verifica diretta.'
    ]);
  }
  if (level === 'A') {
    return sentence([
      templateIntro(kind, level, data),
      'La scheda raccoglie sede, contatti e dati ricavati dal sito ufficiale per aiutare chi consulta la scheda a valutare la struttura prima del contatto.'
    ]);
  }
  return sentence([
    templateIntro(kind, level, data),
    'Dalle informazioni sicure emergono riferimenti utili per chi cerca corsi o attivita nella zona.'
  ]);
}

function buildLong(kind, level, data) {
  const address = data.address ? `La sede indicata e' ${data.address}.` : '';
  const contact = data.contact.value ? `Per il contatto, la scheda segnala ${data.contact.label}.` : '';
  const history = data.history ? `Dalla fonte ufficiale emerge: ${data.history}` : '';
  const courseHint = data.sourceDescription ? `La fonte ufficiale cita contenuti collegati a corsi, attivita o presentazione della struttura.` : '';

  if (level === 'C') {
    return sentence([
      buildShort(kind, level, data),
      address,
      'La preview usa un testo prudente per evitare dati non confermati.'
    ]);
  }

  return sentence([
    buildShort(kind, level, data),
    address,
    contact,
    history || courseHint,
    'I dati non confermati o ambigui restano esclusi dalla proposta editoriale.'
  ]);
}

function pushFaq(faq, question, answer, sourceFields) {
  if (!question || !answer) return;
  faq.push({ question, answer: clean(answer), source_fields: sourceFields });
}

function buildFaq(data, report) {
  const faq = [];
  pushFaq(faq, `Che disciplina propone ${data.name}?`, `${data.name} e' collegata a ${data.discipline}.`, ['discipline']);
  if (data.city || data.address) {
    pushFaq(
      faq,
      `Dove si trova ${data.name}?`,
      data.address ? `${data.name} si trova in ${data.address}${data.city ? `, a ${data.city}` : ''}.` : `${data.name} e' indicata a ${data.city}.`,
      ['indirizzo', 'citta']
    );
  }
  if (data.contact.value) {
    pushFaq(faq, `Come posso contattare ${data.name}?`, `La scheda segnala ${data.contact.label}: ${data.contact.value}.`, [data.contact.label === 'telefono' ? 'telefono' : 'sito']);
  }
  if (safeRow(report, 'descrizione') || safeRow(report, 'storia')) {
    pushFaq(
      faq,
      'Il sito ufficiale indica corsi o attivita?',
      'La fonte ufficiale contiene informazioni utili sulla struttura o sulle attivita, da usare come base per review editoriale.',
      ['descrizione', 'storia']
    );
  }
  if (safeRow(report, 'orari')) {
    pushFaq(faq, 'Sono disponibili orari aggiornati?', `Gli orari rilevati sono: ${safeRow(report, 'orari').app_value || safeRow(report, 'orari').official_value}.`, ['orari']);
  }
  return faq.slice(0, 5);
}

function asUsedFact(row) {
  return {
    field: row.field,
    label: row.field_label || row.field,
    value: row.app_value || row.official_value,
    status: row.status,
    confidence: row.confidence,
    reason: row.reason
  };
}

function qualityScore(level, data, report, usedFacts) {
  let score = level === 'A' ? 82 : level === 'B' ? 68 : 48;
  if (data.address) score += 4;
  if (data.contact.value) score += 4;
  if (data.history || data.sourceDescription) score += 5;
  if (usedFacts.length >= 5) score += 4;
  if (hasConflict(report)) score -= 25;
  return Math.max(30, Math.min(96, score));
}

function needsManualReview(report, score, usedFacts) {
  if (hasConflict(report)) return true;
  if (hasUnclearOfficialData(report) && score < 65) return true;
  if (usedFacts.length < 2) return true;
  return false;
}

function sanitizeCopy(text) {
  return clean(text).replace(FORBIDDEN_COPY_RE, '').replace(/\s+([,.])/g, '$1').replace(/\s{2,}/g, ' ');
}

export function generateGymEditorialPreview(gym, reconciliationReport = {}) {
  const name = valueFor(gym, reconciliationReport, 'nome', ['nome', 'name']) || 'Questa struttura';
  const city = valueFor(gym, reconciliationReport, 'citta', ['citta', 'city']);
  const address = valueFor(gym, reconciliationReport, 'indirizzo', ['indirizzo', 'address']);
  const discipline = disciplineOf(gym, reconciliationReport);
  const contact = contactOf(gym, reconciliationReport);
  const historyRow = safeRow(reconciliationReport, 'storia');
  const descriptionRow = safeRow(reconciliationReport, 'descrizione');
  const data = {
    name,
    city,
    address,
    discipline,
    contact,
    history: clean(historyRow?.official_value || historyRow?.app_value).slice(0, 260),
    sourceDescription: clean(descriptionRow?.official_value || descriptionRow?.app_value).slice(0, 260)
  };

  const kind = detectTemplate(gym, discipline);
  const level = decideLevel(gym, reconciliationReport, data);
  const usedRows = safeRows(reconciliationReport).filter((row) => {
    if (row.field === 'prezzi' && PRICE_OR_PROMO_RE.test(`${row.app_value} ${row.official_value}`)) return false;
    return ['nome', 'citta', 'indirizzo', 'telefono', 'email', 'sito', 'discipline', 'orari', 'descrizione', 'storia', 'staff', 'social'].includes(row.field);
  });
  const usedFacts = usedRows.map(asUsedFact);
  const excludedRows = [
    ...(reconciliationReport?.excluded || reconciliationReport?.reconciliation?.excluded || []),
    ...safeRows(reconciliationReport).filter((row) => row.field === 'prezzi' && PRICE_OR_PROMO_RE.test(`${row.app_value} ${row.official_value}`))
  ];
  const excludedFacts = [...new Map(excludedRows.map((row) => [`${row.field}:${row.status}:${row.official_value || row.app_value}`, asUsedFact(row)])).values()];
  const warnings = [
    ...(reconciliationReport?.warnings || []),
    ...(hasConflict(reconciliationReport) ? ['Conflitti presenti: non pubblicare senza review manuale.'] : []),
    ...(level === 'C' ? ['Preview in fallback sicuro: materiale ufficiale limitato o dati incompleti.'] : []),
    ...(usedFacts.length < 4 ? ['Pochi dati sicuri disponibili per una descrizione ricca.'] : [])
  ];

  const short = sanitizeCopy(buildShort(kind, level, data));
  const long = sanitizeCopy(buildLong(kind, level, data));
  const faq = buildFaq(data, reconciliationReport).map((item) => ({
    ...item,
    answer: sanitizeCopy(item.answer)
  }));
  const score = qualityScore(level, data, reconciliationReport, usedFacts);

  return {
    descrizione_breve: short,
    descrizione_lunga: long,
    faq,
    note_admin: [
      `Template: ${kind}`,
      `Livello ${level}: ${LEVEL_LABELS[level]}`,
      'Preview generata solo da dati riconciliati o app-only non contraddetti.'
    ],
    livello: level,
    livello_label: LEVEL_LABELS[level],
    quality_score: score,
    needs_review: needsManualReview(reconciliationReport, score, usedFacts),
    used_facts: usedFacts,
    excluded_facts: excludedFacts,
    warnings: [...new Set(warnings.map(clean).filter(Boolean))]
  };
}

export { LEVEL_LABELS };
