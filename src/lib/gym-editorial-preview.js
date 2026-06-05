const LEVEL_LABELS = {
  A: 'pronto per revisione',
  B: 'buono, controllare dettagli',
  C: 'fallback sicuro'
};

const FORBIDDEN_COPY_RE =
  /\b(miglior[ei]?|leader|professionisti qualificati|esperienza unica|a 360 gradi|nel mondo moderno|eccellenza|top|imperdibile)\b/i;
const PRICE_OR_PROMO_RE = /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|chf|eur|euro|gratis|promo|promozione|offerta|sconto)\b/i;
const PROCESS_COPY_RE =
  /\b(la scheda|questa scheda|preview|testo prudente|fallback sicuro|dati non confermati|informazioni disponibili|verifica diretta|ricavat[io] dal sito ufficiale|fonte ufficiale|raccoglie|segnala)\b/i;

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
  const aliases = field === 'discipline' ? ['discipline', 'discipline', 'disciplines'] : [field];
  return safeRows(report).find((row) => aliases.includes(row.field)) || null;
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
  if (/\b(judo|karate|taekwondo|kung fu|kungfu|boxe|kickboxing|muay thai|mma|krav maga|wing chun|aikido|bjj|arti marziali|difesa personale)\b/.test(text)) {
    return 'arti_marziali';
  }
  if (/\b(fitness|palestra|funzionale|calisthenics|ems)\b/.test(text)) return 'fitness';
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
  return ['descrizione', 'storia', 'discipline', 'telefono', 'email', 'indirizzo', 'orari'].some((field) => {
    const row = safeRow(report, field);
    return row && (row.status === 'confirmed' || row.status === 'new_from_official');
  });
}

function appDescription(gym) {
  return clean(gym?.descrizione_pubblica || gym?.descrizione_editoriale || gym?.descrizione_generata || gym?.descrizione || gym?.description);
}

function decideLevel(gym, report, data) {
  const completeCore = Boolean(data.name && data.city && data.address && data.discipline && data.contact.value);
  const usableCore = Boolean(data.name && data.city && data.discipline);
  const hasUsefulAppDetail = Boolean(data.address || data.contact.value || appDescription(gym));
  const hasMaterial = Boolean(appDescription(gym) || data.history || safeRow(report, 'descrizione') || safeRow(report, 'discipline'));
  if (hasConflict(report)) return 'C';
  if (completeCore && hasMaterial) return 'A';
  if (completeCore) return 'B';
  if (usableCore && (hasUsefulAppDetail || sourceUseful(report))) return 'B';
  return 'C';
}

function sentence(parts) {
  return clean(parts.filter(Boolean).join(' ')).replace(/\s+([,.])/g, '$1');
}

function significantDisciplineTokens(discipline) {
  return [
    ...new Set(
      fold(discipline)
        .split(/[^a-z0-9]+/i)
        .map(clean)
        .filter((token) => token.length >= 3)
        .filter((token) => !['training', 'fitness', 'sport', 'sportiva', 'attivita', 'corsi', 'corso'].includes(token))
    )
  ];
}

function nameContainsDiscipline(data) {
  const name = fold(data.name);
  return significantDisciplineTokens(data.discipline).some((token) => new RegExp(`\\b${token}\\b`, 'i').test(name));
}

function countTokenMentions(text, token) {
  const matches = fold(text).match(new RegExp(`\\b${token}\\b`, 'gi'));
  return matches ? matches.length : 0;
}

function wouldOverRepeat(baseText, nextText, data, max = 2) {
  if (!nextText) return false;
  return significantDisciplineTokens(data.discipline).some((token) => countTokenMentions(`${baseText} ${nextText}`, token) > max);
}

function joinWithoutKeywordEcho(parts, data, maxMentions = 2) {
  const accepted = [];
  for (const part of parts.map(clean).filter(Boolean)) {
    const current = sentence(accepted);
    if (wouldOverRepeat(current, part, data, maxMentions)) continue;
    accepted.push(part);
  }
  return sentence(accepted);
}

function templateIntro(kind, level, data) {
  const { name, city, discipline } = data;
  const place = city ? ` a ${city}` : '';
  const hasDisciplineInName = nameContainsDiscipline(data);
  if (level === 'C') {
    const fallbackVariants = {
      arti_marziali: hasDisciplineInName ? `${name} e' una scuola${place}.` : `${name} e' una scuola di ${discipline}${place}.`,
      fitness: hasDisciplineInName ? `${name} e' una palestra${place}.` : `${name} e' una palestra${place} collegata a ${discipline}.`,
      crossfit: `${name} e' un box CrossFit${place}.`,
      yoga_pilates: hasDisciplineInName ? `${name} e' uno spazio${place}.` : `${name} e' uno spazio${place} dedicato a ${discipline}.`,
      personal_training: `${name} e' uno studio di personal training${place}.`,
      multidisciplina: hasDisciplineInName ? `${name} e' una struttura sportiva${place}.` : `${name} e' una struttura multidisciplina${place}.`,
      catena_sede: hasDisciplineInName ? `${name} e' una sede sportiva${place}.` : `${name} e' una sede sportiva${place} collegata a ${discipline}.`,
      scheda_povera: hasDisciplineInName ? `${name} e' una struttura sportiva${place}.` : `${name} e' una struttura sportiva${place} collegata a ${discipline}.`
    };
    return fallbackVariants[kind] || fallbackVariants.scheda_povera;
  }

  const variants = {
    arti_marziali:
      level === 'A'
        ? hasDisciplineInName ? `${name} e' una scuola a ${city}.` : `${name} e' una scuola di ${discipline} a ${city}.`
        : hasDisciplineInName ? `${name} e' una scuola a ${city}.` : `${name} e' una scuola di ${discipline} a ${city}.`,
    fitness:
      level === 'A'
        ? hasDisciplineInName ? `${name} e' una palestra a ${city}.` : `${name} e' una palestra a ${city} con attivita legate a ${discipline}.`
        : hasDisciplineInName ? `${name} e' una struttura sportiva di ${city}.` : `${name} e' una struttura sportiva di ${city} collegata a ${discipline}.`,
    crossfit:
      level === 'A'
        ? `${name} e' un box CrossFit a ${city}.`
        : `${name} e' una realta di ${city} dedicata a CrossFit e allenamento funzionale.`,
    yoga_pilates:
      level === 'A'
        ? hasDisciplineInName ? `${name} e' uno spazio a ${city}.` : `${name} e' uno spazio a ${city} dedicato a ${discipline}.`
        : hasDisciplineInName ? `${name} e' una struttura di ${city}.` : `${name} e' una struttura di ${city} collegata a percorsi di ${discipline}.`,
    personal_training:
      level === 'A'
        ? `${name} e' uno studio di personal training a ${city}.`
        : `${name} e' uno studio di ${city} collegato al personal training.`,
    multidisciplina:
      level === 'A'
        ? hasDisciplineInName ? `${name} e' una struttura sportiva a ${city}.` : `${name} e' una struttura multidisciplina a ${city}.`
        : hasDisciplineInName ? `${name} propone attivita sportive a ${city}.` : `${name} propone a ${city} attivita collegate a ${discipline}.`,
    catena_sede:
      level === 'A'
        ? hasDisciplineInName ? `${name} e' una sede a ${city}.` : `${name} e' una sede a ${city} collegata a ${discipline}.`
        : hasDisciplineInName ? `${name} e' una sede sportiva di ${city}.` : `${name} e' una sede sportiva di ${city} con attivita legate a ${discipline}.`,
    scheda_povera: hasDisciplineInName ? `${name} e' una struttura sportiva${place}.` : `${name} e' una struttura sportiva${place} collegata a ${discipline}.`
  };
  return variants[kind] || variants.scheda_povera;
}

function userFitSentence(kind, data) {
  const discipline = data.discipline;
  const lowerDiscipline = fold(discipline);
  const hasDisciplineInName = nameContainsDiscipline(data);
  const variants = {
    arti_marziali:
      hasDisciplineInName
        ? 'La struttura e\' indicata per chi cerca una scuola tecnica nella zona.'
        : lowerDiscipline.includes('kung')
          ? 'La struttura e\' indicata per chi cerca corsi di arti marziali cinesi nella zona.'
          : `La struttura e' indicata per chi cerca corsi di ${discipline} nella zona.`,
    fitness: hasDisciplineInName ? 'Sono indicati sede e recapito per il primo contatto.' : `E' un riferimento locale per chi cerca attivita di ${discipline}.`,
    crossfit: 'E\' pensata per chi cerca classi CrossFit o allenamento funzionale nella zona.',
    yoga_pilates: hasDisciplineInName ? 'E\' indicata per orientarsi tra percorsi e contatti dello studio.' : `E' indicata per chi vuole orientarsi tra percorsi di ${discipline}.`,
    personal_training: 'E\' una soluzione da valutare per percorsi seguiti e allenamento individuale.',
    multidisciplina: `E' utile per chi cerca piu attivita sportive nello stesso contesto.`,
    catena_sede: hasDisciplineInName ? 'E\' una sede da valutare per posizione e contatti.' : `E' una sede da valutare per chi cerca attivita legate a ${discipline}.`,
    scheda_povera: hasDisciplineInName ? 'E\' un riferimento locale da verificare prima del contatto.' : `E' un riferimento locale per chi cerca ${discipline}.`
  };
  return variants[kind] || variants.scheda_povera;
}

function addressSentence(data) {
  if (!data.address) return '';
  const cityPart = data.city && !fold(data.address).includes(fold(data.city)) ? `, a ${data.city}` : '';
  return `La sede si trova in ${data.address}${cityPart}.`;
}

function contactSentence(data) {
  if (!data.contact.value) return '';
  if (data.contact.label === 'telefono') return `Per informazioni e contatti e' disponibile il telefono ${data.contact.value}.`;
  if (data.contact.label === 'sito ufficiale') return `Per approfondire e' disponibile il sito ${data.contact.value}.`;
  return '';
}

function sourceContextSentence(data) {
  const raw = clean(data.history || data.sourceDescription);
  if (!raw || PROCESS_COPY_RE.test(raw)) return '';
  const chunks = raw
    .replace(/([.!?])\s+/g, '$1|')
    .split(/\s*\|\s*/)
    .map(clean)
    .filter((chunk) => chunk.length >= 45 && chunk.length <= 220)
    .filter((chunk) => !PROCESS_COPY_RE.test(chunk));
  const preferred =
    chunks.find((chunk) => /\b(corsi|corso|attivita|allenament|nasce|scuola|studio|box)\b/i.test(chunk)) || chunks[0] || '';
  return preferred.replace(/[.!?]*$/, '.');
}

function buildShort(kind, level, data) {
  if (level === 'C') {
    return templateIntro(kind, level, data);
  }
  if (level === 'A') {
    return joinWithoutKeywordEcho([
      templateIntro(kind, level, data),
      userFitSentence(kind, data)
    ], data);
  }
  return joinWithoutKeywordEcho([
    templateIntro(kind, level, data),
    data.address || data.contact.value ? '' : userFitSentence(kind, data)
  ], data);
}

function buildLong(kind, level, data) {
  const address = addressSentence(data);
  const contact = contactSentence(data);
  const history = sourceContextSentence(data);
  const courseHint = userFitSentence(kind, data);

  if (level === 'C') {
    return joinWithoutKeywordEcho([
      buildShort(kind, level, data),
      address,
      contact
    ], data);
  }

  return joinWithoutKeywordEcho([
    buildShort(kind, level, data),
    address,
    contact,
    history || courseHint
  ], data);
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
    const answer =
      data.contact.label === 'telefono'
        ? `Puoi contattare ${data.name} al numero ${data.contact.value}.`
        : `Puoi approfondire tramite il sito ${data.contact.value}.`;
    pushFaq(faq, `Come posso contattare ${data.name}?`, answer, [data.contact.label === 'telefono' ? 'telefono' : 'sito']);
  }
  if (safeRow(report, 'descrizione') || safeRow(report, 'storia')) {
    pushFaq(
      faq,
      'Il sito ufficiale indica corsi o attivita?',
      `${data.name} presenta informazioni collegate alla struttura o alle attivita proposte.`,
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
    reason: row.reason,
    source_facts: row.source_facts || []
  };
}

function reportFromFactLists(usedFacts = [], excludedFacts = []) {
  const rows = [...usedFacts, ...excludedFacts].map((fact) => ({
    field: fact.field,
    field_label: fact.label || fact.field_label || fact.field,
    app_value: fact.app_value || '',
    official_value: fact.official_value || '',
    status: fact.status,
    confidence: fact.confidence,
    reason: fact.reason || '',
    source_facts: fact.source_facts || []
  }));
  return {
    rows,
    editorial_eligible: usedFacts,
    used_facts: usedFacts,
    excluded: excludedFacts,
    excluded_facts: excludedFacts,
    conflicts: rows.filter((row) => row.status === 'conflict'),
    warnings: []
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
  return clean(text)
    .replace(FORBIDDEN_COPY_RE, '')
    .replace(/\bLa scheda segnala\b/gi, '')
    .replace(/\bLa scheda raccoglie\b/gi, '')
    .replace(/\bDalla scheda emerge:?\b/gi, '')
    .replace(/\bDalla fonte ufficiale emerge:?\b/gi, '')
    .replace(/\bfonte ufficiale\b/gi, '')
    .replace(/\bpreview\b/gi, '')
    .replace(/\btesto prudente\b/gi, '')
    .replace(/\binformazioni disponibili\b/gi, 'riferimenti presenti')
    .replace(/\s+([,.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function generateGymEditorialPreview(gym, reconciliationReport = {}, explicitExcludedFacts = null) {
  if (Array.isArray(reconciliationReport)) {
    reconciliationReport = reportFromFactLists(reconciliationReport, Array.isArray(explicitExcludedFacts) ? explicitExcludedFacts : []);
  }
  const name = valueFor(gym, reconciliationReport, 'nome', ['nome', 'name']) || 'Questa struttura';
  const city = valueFor(gym, reconciliationReport, 'citta', ['citta', 'city']);
  const address = valueFor(gym, reconciliationReport, 'indirizzo', ['indirizzo', 'address']);
  const discipline = disciplineOf(gym, reconciliationReport);
  const contact = contactOf(gym, reconciliationReport);
  const historyRow = safeRow(reconciliationReport, 'storia');
  const descriptionRow = safeRow(reconciliationReport, 'descrizione');
  const officialRows = safeRows(reconciliationReport).filter((row) => row.status === 'confirmed' || row.status === 'new_from_official');
  const appTextMaterial = appDescription(gym);
  const data = {
    name,
    city,
    address,
    discipline,
    contact,
    history: clean(historyRow?.official_value || historyRow?.app_value || appTextMaterial).slice(0, 260),
    sourceDescription: clean(descriptionRow?.official_value || descriptionRow?.app_value || appTextMaterial).slice(0, 260),
    hasOfficialFacts: officialRows.length > 0
  };

  const kind = detectTemplate(gym, discipline);
  const level = decideLevel(gym, reconciliationReport, data);
  const usedRows = (Array.isArray(reconciliationReport?.used_facts) ? reconciliationReport.used_facts : safeRows(reconciliationReport)).filter((row) => {
    if (row.field === 'prezzi' && PRICE_OR_PROMO_RE.test(`${row.app_value} ${row.official_value}`)) return false;
    return ['nome', 'citta', 'indirizzo', 'telefono', 'email', 'sito', 'discipline', 'orari', 'descrizione', 'storia', 'staff', 'social'].includes(row.field);
  });
  const usedFacts = usedRows.map((row) => (row.label && row.value ? row : asUsedFact(row)));
  const excludedRows = [
    ...(reconciliationReport?.excluded_facts || reconciliationReport?.excluded || reconciliationReport?.reconciliation?.excluded || []),
    ...safeRows(reconciliationReport).filter((row) => row.field === 'prezzi' && PRICE_OR_PROMO_RE.test(`${row.app_value} ${row.official_value}`))
  ];
  const excludedFacts = [
    ...new Map(
      excludedRows.map((row) => {
        const item = row.label && row.value ? row : asUsedFact(row);
        return [`${item.field}:${item.status}:${item.official_value || item.app_value || item.value}`, item];
      })
    ).values()
  ];
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
