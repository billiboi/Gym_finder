const SECTION_KEYS = [
  'chi_siamo',
  'storia',
  'corsi',
  'discipline',
  'orari',
  'prezzi',
  'contatti',
  'indirizzo',
  'staff',
  'eventi',
  'note'
];

const SECTION_LABELS = {
  chi_siamo: 'Chi siamo',
  storia: 'Storia',
  corsi: 'Corsi',
  discipline: 'Discipline',
  orari: 'Orari',
  prezzi: 'Prezzi',
  contatti: 'Contatti',
  indirizzo: 'Indirizzo',
  staff: 'Staff',
  eventi: 'Eventi',
  note: 'Note'
};

const SECTION_PATTERNS = {
  chi_siamo: /\b(chi siamo|about|associazione|societ[aà]|centro|palestra|mission|filosofia|valori)\b/i,
  storia: /\b(storia|fondat[ao]|nasc[ei]|dal\s+\d{4}|anno|tradizione|esperienza|percorso)\b/i,
  corsi: /\b(corsi?|lezioni?|allenamenti?|attivit[aà]|programmi?|training|workout|classi)\b/i,
  discipline:
    /\b(disciplin[ae]|fitness|pilates|yoga|crossfit|judo|karate|taekwondo|boxe|kickboxing|muay thai|mma|bjj|krav maga|wing chun|arti marziali|funzionale|posturale|calisthenics|danza|nuoto)\b/i,
  orari: /\b(orari?|apert[ou]ra|lun(?:ed[iì])?|mar(?:ted[iì])?|mer(?:coled[iì])?|gio(?:ved[iì])?|ven(?:erd[iì])?|sab(?:ato)?|dom(?:enica)?|\d{1,2}[:.]\d{2})\b/i,
  prezzi: /\b(prezz[io]|tariff[ae]|abbonament[io]|quota|quote|iscrizion[ei]|mensile|annuale|listino|costo|costi|chf|eur|euro|€|fr\.)\b/i,
  contatti: /\b(contatti?|telefono|tel\.?|cellulare|whatsapp|email|e-mail|mail|prenota|scrivici|chiamaci)\b/i,
  indirizzo: /\b(indirizzo|sede|dove siamo|via|viale|piazza|corso|largo|strada|loc\.|ch-\d{4}|\b\d{5}\b)\b/i,
  staff: /\b(staff|team|maestr[oi]|insegnant[ei]|istruttor[ei]|trainer|coach|docent[ei]|direttore|fondatore)\b/i,
  eventi: /\b(eventi?|stage|seminari?|gare|tornei|campionati|workshop|open day|news|novit[aà])\b/i
};

const MENU_WORDS = /\b(home|menu|top menu|skip to content|vai al contenuto|navigation|navigazione|toggle navigation|main menu|primary menu|footer|header|copyright|privacy|cookie|cookies|policy|termini|condizioni|credits|powered by|sitemap|login|area riservata)\b/i;
const LOW_VALUE_LINE = /^(home|menu|top menu|skip to content|vai al contenuto|chiudi|apri|cerca|search|login|logout|privacy|cookie|cookies|copyright|contatti|gallery|news|blog|faq|shop|cart|carrello)$/i;
const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/g;
const PRICE_RE = /(?:chf|eur|euro|€|fr\.)\s*\d+(?:[,.]\d+)?|\d+(?:[,.]\d+)?\s*(?:chf|eur|euro|€|fr\.)/gi;
const ADDRESS_RE = /\b(?:via|viale|piazza|corso|largo|strada|vicolo|contrada)\s+[A-ZÀ-Üa-zà-ÿ0-9'’., -]{3,80}(?:\b\d+[A-Za-z]?)?/gi;
const SCHEDULE_RE =
  /\b(?:lun(?:ed[iì])?|mar(?:ted[iì])?|mer(?:coled[iì])?|gio(?:ved[iì])?|ven(?:erd[iì])?|sab(?:ato)?|dom(?:enica)?)(?:[^\n.;]{0,80}?\d{1,2}[:.]\d{2}(?:\s*[-–]\s*\d{1,2}[:.]\d{2})?)/gi;

const DISCIPLINES = [
  'Aikido',
  'Arti Marziali',
  'Boxe',
  'Brazilian Jiu Jitsu',
  'Calisthenics',
  'CrossFit',
  'Danza',
  'Difesa Personale',
  'Fitness',
  'Grappling',
  'Judo',
  'Karate',
  'Kickboxing',
  'Krav Maga',
  'MMA',
  'Muay Thai',
  'Nuoto',
  'Padel',
  'Pilates',
  'Taekwondo',
  'Wing Chun',
  'Yoga',
  'Allenamento funzionale',
  'Ginnastica posturale',
  'Personal training'
];

function clean(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fold(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeBlock(value) {
  return fold(value)
    .replace(URL_RE, '')
    .replace(EMAIL_RE, ' email ')
    .replace(PHONE_RE, ' telefono ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value) {
  return normalizeBlock(value).split(/\s+/).filter(Boolean);
}

function tokenSet(value) {
  return new Set(words(value).filter((word) => word.length > 2));
}

function jaccard(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

function informationScore(value) {
  const text = clean(value);
  const wordCount = words(text).length;
  const signals = SECTION_KEYS.reduce((score, key) => score + (SECTION_PATTERNS[key]?.test(text) ? 6 : 0), 0);
  const facts =
    (text.match(EMAIL_RE)?.length || 0) * 8 +
    (text.match(PHONE_RE)?.length || 0) * 5 +
    (text.match(PRICE_RE)?.length || 0) * 7 +
    (text.match(SCHEDULE_RE)?.length || 0) * 7 +
    (text.match(ADDRESS_RE)?.length || 0) * 7;
  return wordCount + signals + facts;
}

function splitBlocks(text) {
  const normalized = clean(text)
    .replace(/[•·]/g, '\n')
    .replace(/\s+\|\s+/g, '\n')
    .replace(/(?<=[.!?])\s+(?=[A-ZÀ-Ü0-9])/g, '\n');

  return normalized
    .split(/\n+/)
    .map((line) => clean(line))
    .flatMap((line) => {
      if (line.length < 260) return [line];
      return line.split(/(?<=[.!?;])\s+/).map((part) => clean(part));
    })
    .filter(Boolean);
}

function isMostlyUppercaseMenu(line) {
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 8) return false;
  const upper = letters.replace(/[^A-ZÀ-Ü]/g, '').length;
  const shortWords = words(line).filter((word) => word.length <= 12).length;
  return upper / letters.length > 0.75 && shortWords >= 2 && !PRICE_RE.test(line) && !SCHEDULE_RE.test(line);
}

function isLowValueLine(line, counts) {
  const text = clean(line);
  const folded = fold(text);
  const wordCount = words(text).length;
  if (!text) return true;
  if (LOW_VALUE_LINE.test(text)) return true;
  if (/\b(skip to content|top menu|toggle navigation|powered by|all rights reserved|cookie policy|privacy policy)\b/i.test(text)) return true;
  if (wordCount <= 2 && counts.get(normalizeBlock(text)) > 1) return true;
  if (wordCount <= 5 && counts.get(normalizeBlock(text)) > 2 && MENU_WORDS.test(text)) return true;
  if (isMostlyUppercaseMenu(text) && wordCount <= 14) return true;
  if (folded.includes('copyright') || folded.includes('all rights reserved')) return true;
  if (folded.includes('informativa privacy') || folded.includes('cookie policy')) return true;
  return false;
}

function removeNavigationFragments(value) {
  let text = clean(value);
  const menuToken = '(?:HOME|CHI SIAMO|CORSI|GALLERY|CONTATTI|NEWS|BLOG|FAQ|SHOP|ORARI|DOVE SIAMO|STAFF|TEAM)';
  text = text
    .replace(/^Home\s+(?=[A-ZÀ-Ü])/i, ' ')
    .replace(new RegExp(`\\b${menuToken}(?:\\s+${menuToken}){2,}\\b`, 'g'), ' ')
    .replace(/\bHome(?:\s+Home){1,}\b/g, ' ')
    .replace(/\bTop Menu\b/gi, ' ')
    .replace(/\bSkip to content\b/gi, ' ')
    .replace(/\bVai al contenuto\b/gi, ' ')
    .replace(/\bToggle navigation\b/gi, ' ')
    .replace(/\bCookie Policy\b/gi, ' ')
    .replace(/\bPrivacy Policy\b/gi, ' ')
    .replace(/\bCopyright\s*\d{0,4}\b/gi, ' ');

  const wordsList = text.split(/\s+/);
  const firstRichIndex = wordsList.findIndex((word, index) => {
    const tail = wordsList.slice(index, index + 10).join(' ');
    return /\b(nasce|propone|offre|dedicat[ao]|scuola|palestra|associazione|centro|corsi?|allenamenti?|orari?|contatti?)\b/i.test(tail);
  });

  if (firstRichIndex > 0 && MENU_WORDS.test(wordsList.slice(0, firstRichIndex).join(' '))) {
    text = wordsList.slice(firstRichIndex).join(' ');
  }

  return clean(removeRepeatedPrefix(text));
}

function removeRepeatedPrefix(value) {
  const parts = clean(value).split(/\s+/);
  for (let size = 5; size >= 2; size -= 1) {
    if (parts.length < size * 2) continue;
    const first = parts.slice(0, size).join(' ');
    const second = parts.slice(size, size * 2).join(' ');
    if (fold(first) === fold(second)) {
      return [...parts.slice(0, size), ...parts.slice(size * 2)].join(' ');
    }
  }
  return value;
}

export function dedupeTextBlocks(text) {
  const blocks = splitBlocks(text);
  const bestByExact = new Map();

  for (const block of blocks) {
    const key = normalizeBlock(block);
    if (!key || key.length < 3) continue;
    const previous = bestByExact.get(key);
    if (!previous || informationScore(block) > informationScore(previous)) bestByExact.set(key, block);
  }

  const selected = [];
  for (const block of bestByExact.values()) {
    const duplicateIndex = selected.findIndex((item) => {
      const score = jaccard(item, block);
      const itemWords = words(item);
      const blockWords = words(block);
      const shorter = Math.min(itemWords.length, blockWords.length);
      const shorterText = itemWords.length <= blockWords.length ? normalizeBlock(item) : normalizeBlock(block);
      const longerText = itemWords.length > blockWords.length ? normalizeBlock(item) : normalizeBlock(block);
      return score >= 0.9 || (score >= 0.82 && shorter >= 8) || (shorter >= 3 && longerText.includes(shorterText));
    });

    if (duplicateIndex < 0) {
      selected.push(block);
      continue;
    }

    if (informationScore(block) > informationScore(selected[duplicateIndex])) selected[duplicateIndex] = block;
  }

  return selected.join('\n\n').trim();
}

export function cleanOfficialScrape(rawText) {
  const raw = clean(rawText)
    .replace(URL_RE, ' ')
    .replace(/\b(?:Home\s*[-|])+/gi, ' ')
    .replace(/\s{2,}/g, ' ');
  const firstPassBlocks = splitBlocks(raw).map(removeNavigationFragments);
  const counts = new Map();

  for (const block of firstPassBlocks) {
    const key = normalizeBlock(block);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const informativeBlocks = firstPassBlocks.filter((block) => {
    if (isLowValueLine(block, counts)) return false;
    const wordCount = words(block).length;
    if (wordCount <= 3 && !EMAIL_RE.test(block) && !PHONE_RE.test(block) && !PRICE_RE.test(block)) return false;
    if (MENU_WORDS.test(block) && wordCount <= 8 && !SECTION_KEYS.some((key) => SECTION_PATTERNS[key]?.test(block))) return false;
    return true;
  });

  return dedupeTextBlocks(informativeBlocks.join('\n'));
}

function confidenceFor(text, key) {
  const score = informationScore(text);
  const hasPattern = SECTION_PATTERNS[key]?.test(text);
  if (!text) return 'low';
  if (hasPattern && score >= 38) return 'high';
  if (hasPattern || score >= 28) return 'medium';
  return 'low';
}

function emptySection() {
  return { text: '', confidence: 'low', warnings: ['Nessun contenuto rilevato con sufficiente chiarezza.'] };
}

export function extractOfficialSections(cleanText) {
  const sections = Object.fromEntries(SECTION_KEYS.map((key) => [key, emptySection()]));
  const warnings = [];
  const blocks = splitBlocks(cleanText);

  for (const block of blocks) {
    const matches = SECTION_KEYS.filter((key) => key !== 'note' && SECTION_PATTERNS[key]?.test(block));
    const target = matches[0] || (informationScore(block) >= 18 ? 'note' : '');
    if (!target) continue;
    const current = sections[target].text;
    sections[target] = {
      text: dedupeTextBlocks([current, block].filter(Boolean).join('\n')),
      confidence: 'low',
      warnings: []
    };
  }

  for (const key of SECTION_KEYS) {
    const section = sections[key];
    if (!section.text) continue;
    const sectionWarnings = [];
    if (MENU_WORDS.test(section.text)) sectionWarnings.push('Possibile residuo di navigazione o testo legale.');
    if (words(section.text).length < 8) sectionWarnings.push('Sezione breve: richiede review manuale.');
    sections[key] = {
      text: section.text,
      confidence: confidenceFor(section.text, key),
      warnings: sectionWarnings
    };
  }

  if (!blocks.length) warnings.push('Testo pulito vuoto o non leggibile.');
  if (!sections.chi_siamo.text && !sections.corsi.text && !sections.discipline.text) {
    warnings.push('Poche informazioni editoriali affidabili: non usare per generare descrizioni senza review.');
  }

  return { sections, warnings };
}

function fact(value, source_section, confidence = 'medium', warning = '') {
  return { value: clean(value), source_section, confidence, warning };
}

function pushUnique(target, item) {
  if (!item.value) return;
  const key = normalizeBlock(`${item.source_section}:${item.value}`);
  if (target.some((existing) => normalizeBlock(`${existing.source_section}:${existing.value}`) === key)) return;
  target.push(item);
}

function peopleFromText(text) {
  const matches = [];
  const re = /\b(?:maestro|maestra|istruttore|istruttrice|coach|trainer|insegnante|fondatore|fondatrice)\s+([A-ZÀ-Ü][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-Ü][A-Za-zÀ-ÿ'’.-]+){0,2})/g;
  let match;
  while ((match = re.exec(text))) matches.push(match[0]);
  return matches;
}

export function extractOfficialFacts(sectionPayload) {
  const sections = sectionPayload?.sections || sectionPayload || {};
  const facts = {
    phones_found: [],
    emails_found: [],
    addresses_found: [],
    disciplines_found: [],
    schedules_found: [],
    prices_found: [],
    people_found: [],
    organization_history: [],
    source_highlights: []
  };
  const warnings = [...(sectionPayload?.warnings || [])];

  for (const [key, section] of Object.entries(sections)) {
    const text = clean(section?.text || '');
    if (!text) continue;

    for (const value of text.match(PHONE_RE) || []) {
      if (clean(value).replace(/\D/g, '').length >= 7) pushUnique(facts.phones_found, fact(value, key, section.confidence));
    }
    for (const value of text.match(EMAIL_RE) || []) pushUnique(facts.emails_found, fact(value, key, 'high'));
    for (const value of text.match(ADDRESS_RE) || []) pushUnique(facts.addresses_found, fact(value, key, section.confidence));
    for (const value of text.match(SCHEDULE_RE) || []) pushUnique(facts.schedules_found, fact(value, key, section.confidence));
    for (const value of text.match(PRICE_RE) || []) pushUnique(facts.prices_found, fact(value, key, section.confidence, 'Importo da verificare sul sito prima di pubblicare.'));
    for (const person of peopleFromText(text)) pushUnique(facts.people_found, fact(person, key, section.confidence));

    for (const discipline of DISCIPLINES) {
      const re = new RegExp(`\\b${discipline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) pushUnique(facts.disciplines_found, fact(discipline, key, 'high'));
    }

    if (key === 'storia' || /\b(dal\s+\d{4}|fondat[ao]|nasc[ei])\b/i.test(text)) {
      pushUnique(facts.organization_history, fact(text.slice(0, 420), key, section.confidence));
    }

    if (['chi_siamo', 'corsi', 'discipline', 'orari', 'prezzi', 'contatti'].includes(key)) {
      pushUnique(facts.source_highlights, fact(text.slice(0, 360), key, section.confidence));
    }
  }

  if (!facts.phones_found.length && !facts.emails_found.length) warnings.push('Nessun contatto strutturato rilevato.');
  if (!facts.disciplines_found.length && !facts.schedules_found.length && !facts.prices_found.length) {
    warnings.push('Pochi fatti strutturati rilevati: sito povero o testo ancora rumoroso.');
  }

  return { facts, warnings };
}

export function analyzeOfficialScrape(rawText) {
  const cleanText = cleanOfficialScrape(rawText);
  const sectionPayload = extractOfficialSections(cleanText);
  const factPayload = extractOfficialFacts(sectionPayload);
  return {
    raw_text: clean(rawText),
    clean_text: cleanText,
    sections: sectionPayload.sections,
    facts: factPayload.facts,
    warnings: [...new Set([...sectionPayload.warnings, ...factPayload.warnings])],
    section_labels: SECTION_LABELS
  };
}
