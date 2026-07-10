import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

const dataDir = path.join(process.cwd(), 'data');
const claimRequestsFilePath = path.join(dataDir, 'claim-requests.json');
const isReadOnlyRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_CLAIMS_TABLE = process.env.SUPABASE_CLAIMS_TABLE || 'claim_requests';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SITE_URL = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.palestreinzona.it').replace(/\/$/, '');
const CLAIM_NOTIFICATION_TO =
  process.env.CLAIM_NOTIFICATION_TO || process.env.SITE_CONTACT_EMAIL || 'info@palestreinzona.it';
const CLAIM_NOTIFICATION_FROM =
  process.env.CLAIM_NOTIFICATION_FROM || 'Palestre in Zona <onboarding@resend.dev>';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
const hasResend = Boolean(RESEND_API_KEY && CLAIM_NOTIFICATION_TO && CLAIM_NOTIFICATION_FROM);
const CLAIM_LIST_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'gym_id',
  'gym_name',
  'gym_url',
  'requester_name',
  'requester_email',
  'requester_role',
  'status',
  'approved_at',
  'rejected_at',
  'email_verified_at'
];
const CLAIM_DETAIL_COLUMNS = [
  ...CLAIM_LIST_COLUMNS,
  'reason',
  'requester_phone',
  'message',
  'verification_token',
  'verification_sent_at',
  'owner_token',
  'requested_updates',
  'image_uploads',
  'admin_notes'
];
const EXTENDED_WRITE_KEYS = new Set([
  'gym_id',
  'verification_token',
  'verification_sent_at',
  'email_verified_at',
  'approved_at',
  'rejected_at',
  'owner_token',
  'requested_updates',
  'image_uploads',
  'admin_notes',
  'updated_at'
]);

function clean(value) {
  return String(value ?? '').trim();
}

function token() {
  return randomBytes(24).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (!clean(value)) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeStatus(value) {
  const status = clean(value).toLowerCase();
  if (status === 'new' || status === 'reviewed') return 'pending';
  if (['in_review', 'in revisione', 'review', 'reviewing'].includes(status)) return 'in_review';
  if (['resolved', 'risolta', 'risolto'].includes(status)) return 'resolved';
  if (['approve', 'approvata', 'approvato'].includes(status)) return 'approved';
  if (['reject', 'rifiutata', 'rifiutato'].includes(status)) return 'rejected';
  return ['pending', 'in_review', 'approved', 'rejected', 'resolved'].includes(status) ? status : 'pending';
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra
  };
}

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function boundedNumber(value, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function supabaseErrorMessage(response, details, action) {
  if (response.status === 404 || response.status === 400) {
    return `${action}: verifica che la tabella "${SUPABASE_CLAIMS_TABLE}" abbia le colonne della migration claim system. ${details}`.trim();
  }
  if (response.status === 401 || response.status === 403) {
    return `${action}: richiesta non autorizzata su Supabase. Verifica SUPABASE_SERVICE_ROLE_KEY e RLS. ${details}`.trim();
  }
  return `${action} (${response.status}). ${details}`.trim();
}

async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(claimRequestsFilePath, 'utf-8');
  } catch {
    await writeFile(claimRequestsFilePath, '[]', 'utf-8');
  }
}

export function normalizeClaimRequest(input) {
  const createdAt = clean(input?.created_at) || nowIso();
  return {
    id: clean(input?.id) || `claim-${randomUUID()}`,
    gym_id: clean(input?.gym_id),
    gym_name: clean(input?.gym_name),
    gym_url: clean(input?.gym_url),
    reason: clean(input?.reason) || 'Rivendicazione scheda',
    requester_name: clean(input?.requester_name),
    requester_role: clean(input?.requester_role),
    requester_email: clean(input?.requester_email).toLowerCase(),
    requester_phone: clean(input?.requester_phone),
    message: clean(input?.message),
    status: normalizeStatus(input?.status),
    verification_token: clean(input?.verification_token),
    verification_sent_at: clean(input?.verification_sent_at),
    email_verified_at: clean(input?.email_verified_at),
    approved_at: clean(input?.approved_at),
    rejected_at: clean(input?.rejected_at),
    owner_token: clean(input?.owner_token),
    requested_updates: safeJson(input?.requested_updates, {}),
    image_uploads: safeJson(input?.image_uploads, []),
    admin_notes: clean(input?.admin_notes),
    created_at: createdAt,
    updated_at: clean(input?.updated_at) || createdAt
  };
}

function normalizeClaimRequestListItem(input) {
  const createdAt = clean(input?.created_at);
  return {
    id: clean(input?.id),
    created_at: createdAt,
    updated_at: clean(input?.updated_at) || createdAt,
    gym_id: clean(input?.gym_id),
    gym_name: clean(input?.gym_name),
    gym_url: clean(input?.gym_url),
    requester_name: clean(input?.requester_name),
    requester_email: clean(input?.requester_email).toLowerCase(),
    requester_role: clean(input?.requester_role),
    status: normalizeStatus(input?.status),
    approved_at: clean(input?.approved_at),
    rejected_at: clean(input?.rejected_at),
    email_verified_at: clean(input?.email_verified_at)
  };
}

function claimToSupabaseRecord(input, { legacy = false } = {}) {
  const request = normalizeClaimRequest(input);
  const record = { ...request };

  if (legacy) {
    for (const key of EXTENDED_WRITE_KEYS) delete record[key];
  }

  return record;
}

async function responseDetails(response) {
  try {
    const payload = await response.json();
    return [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
  } catch {
    return await response.text().catch(() => '');
  }
}

async function writeClaimRequestToSupabase(request) {
  async function post(record) {
    return fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}`, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify([record])
    });
  }

  let response = await post(claimToSupabaseRecord(request));
  if (!response.ok && response.status === 400) {
    response = await post(claimToSupabaseRecord(request, { legacy: true }));
  }

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Salvataggio claim non riuscito'));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeClaimRequest({ ...request, ...rows[0] }) : request;
}

async function writeClaimRequestToFile(request) {
  await ensureStorage();
  const raw = await readFile(claimRequestsFilePath, 'utf-8');
  const current = JSON.parse(raw);
  const next = Array.isArray(current) ? current : [];
  next.push(request);
  await writeFile(claimRequestsFilePath, JSON.stringify(next, null, 2), 'utf-8');
  return request;
}

async function patchClaimRequestInSupabase(id, patch) {
  async function patchRecord(record) {
    return fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(record)
    });
  }

  let response = await patchRecord(patch);
  if (!response.ok && response.status === 400) {
    const legacyPatch = { ...patch };
    for (const key of EXTENDED_WRITE_KEYS) delete legacyPatch[key];
    response = await patchRecord(legacyPatch);
  }

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Aggiornamento claim non riuscito'));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeClaimRequest(rows[0]) : null;
}

async function updateClaimRequestInFile(id, patch) {
  await ensureStorage();
  const raw = await readFile(claimRequestsFilePath, 'utf-8');
  const current = JSON.parse(raw);
  const next = Array.isArray(current) ? current : [];
  const index = next.findIndex((item) => String(item?.id) === id);

  if (index < 0) throw new Error('Richiesta non trovata.');

  next[index] = normalizeClaimRequest({
    ...next[index],
    ...patch,
    updated_at: nowIso()
  });

  await writeFile(claimRequestsFilePath, JSON.stringify(next, null, 2), 'utf-8');
  return next[index];
}

async function sendEmail({ to, subject, text }) {
  if (!hasResend || !to) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: CLAIM_NOTIFICATION_FROM,
      to: [to],
      subject,
      text
    })
  });
}

async function sendClaimNotification(request) {
  const subject = `Nuova richiesta claim: ${request.gym_name || 'Scheda senza nome'}`;
  const text = [
    'Nuova richiesta ricevuta da Palestre in Zona',
    '',
    `ID: ${request.id}`,
    `Stato: ${request.status}`,
    `Palestra: ${request.gym_name}`,
    `Link scheda: ${request.gym_url || '-'}`,
    `Motivo: ${request.reason}`,
    `Richiedente: ${request.requester_name}`,
    `Ruolo: ${request.requester_role || '-'}`,
    `Email: ${request.requester_email}`,
    `Telefono: ${request.requester_phone || '-'}`,
    '',
    'Messaggio:',
    request.message || '-'
  ].join('\n');

  await sendEmail({ to: CLAIM_NOTIFICATION_TO, subject, text });
}

async function sendVerificationEmail(request) {
  if (!request.requester_email || !request.verification_token) return;
  const verifyUrl = `${SITE_URL}/rivendica-scheda/verifica/${request.verification_token}`;
  const text = [
    `Ciao ${request.requester_name || ''},`,
    '',
    'abbiamo ricevuto la richiesta per gestire una scheda su Palestre in Zona.',
    'Per continuare, verifica la tua email aprendo questo link:',
    verifyUrl,
    '',
    'Dopo la verifica, la richiesta passa in approval manuale. Nessuna modifica viene pubblicata automaticamente.',
    '',
    `Palestra: ${request.gym_name || '-'}`,
    `ID richiesta: ${request.id}`
  ].join('\n');

  await sendEmail({
    to: request.requester_email,
    subject: `Verifica email per ${request.gym_name || 'la tua richiesta'}`,
    text
  });
}

async function sendOwnerDashboardEmail(request) {
  if (!request.requester_email || !request.owner_token) return;
  const dashboardUrl = `${SITE_URL}/dashboard-proprietario/${request.owner_token}`;
  const text = [
    `Ciao ${request.requester_name || ''},`,
    '',
    'la richiesta è stata approvata.',
    'Puoi proporre aggiornamenti da questa dashboard:',
    dashboardUrl,
    '',
    'Le modifiche restano in revisione: non vengono pubblicate senza controllo admin.',
    '',
    `Palestra: ${request.gym_name || '-'}`,
    `ID richiesta: ${request.id}`
  ].join('\n');

  await sendEmail({
    to: request.requester_email,
    subject: `Dashboard proprietario approvata per ${request.gym_name || 'la scheda'}`,
    text
  });
}

export function canPersistClaimRequests() {
  return hasSupabase || !isReadOnlyRuntime;
}

async function readClaimRequestsFromSupabase({ limit = 500, offset = 0 } = {}) {
  const safeLimit = boundedNumber(limit, 500, { min: 1, max: 500 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const params = new URLSearchParams({
    select: CLAIM_DETAIL_COLUMNS.join(','),
    order: 'created_at.desc',
    limit: String(safeLimit),
    offset: String(safeOffset)
  });
  const response = await fetch(
    `${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?${params}`,
    {
      method: 'GET',
      headers: supabaseHeaders()
    }
  );

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Lettura claim non riuscita'));
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows.map((row) => normalizeClaimRequest(row)) : [];
}

async function readClaimRequestsListFromSupabase({ limit = 50, offset = 0, status = '' } = {}) {
  const safeLimit = boundedNumber(limit, 50, { min: 1, max: 100 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const normalizedStatus = clean(status) ? normalizeStatus(status) : '';
  const params = new URLSearchParams({
    select: CLAIM_LIST_COLUMNS.join(','),
    order: 'created_at.desc',
    limit: String(safeLimit),
    offset: String(safeOffset)
  });

  if (normalizedStatus) params.set('status', `eq.${normalizedStatus}`);

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?${params}`, {
    method: 'GET',
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Lettura lista claim non riuscita'));
  }

  const rows = await response.json();
  return {
    items: Array.isArray(rows) ? rows.map((row) => normalizeClaimRequestListItem(row)) : [],
    limit: safeLimit,
    offset: safeOffset,
    hasMore: Array.isArray(rows) && rows.length === safeLimit
  };
}

async function readClaimRequestByIdFromSupabase(id) {
  const cleanId = clean(id);
  if (!cleanId) return null;
  const params = new URLSearchParams({
    select: CLAIM_DETAIL_COLUMNS.join(','),
    order: 'created_at.desc',
    limit: '1',
    id: `eq.${cleanId}`
  });
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?${params}`, {
    method: 'GET',
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, 'Lettura claim non riuscita'));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeClaimRequest(rows[0]) : null;
}

async function readClaimRequestByTokenFromSupabase(column, value, action) {
  const cleanValue = clean(value);
  if (!cleanValue || !['owner_token', 'verification_token'].includes(column)) return null;
  const params = new URLSearchParams({
    select: CLAIM_DETAIL_COLUMNS.join(','),
    [column]: `eq.${cleanValue}`,
    limit: '1'
  });
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?${params}`, {
    method: 'GET',
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const details = await responseDetails(response);
    throw new Error(supabaseErrorMessage(response, details, action));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeClaimRequest(rows[0]) : null;
}

async function readClaimRequestsFromFile() {
  await ensureStorage();
  try {
    const raw = await readFile(claimRequestsFilePath, 'utf-8');
    const current = JSON.parse(raw);
    return Array.isArray(current)
      ? current
          .map((item) => normalizeClaimRequest(item))
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      : [];
  } catch {
    return [];
  }
}

export async function readClaimRequests() {
  if (hasSupabase) {
    try {
      return await readClaimRequestsFromSupabase();
    } catch {
      return [];
    }
  }
  if (isReadOnlyRuntime) return [];
  return readClaimRequestsFromFile();
}

export async function readClaimRequestsList(options = {}) {
  const safeLimit = boundedNumber(options.limit, 50, { min: 1, max: 100 });
  const safeOffset = boundedNumber(options.offset, 0, { min: 0 });

  if (hasSupabase) {
    try {
      return await readClaimRequestsListFromSupabase(options);
    } catch (err) {
      return {
        items: [],
        limit: safeLimit,
        offset: safeOffset,
        hasMore: false,
        error: err?.message || 'Lettura richieste non riuscita.'
      };
    }
  }
  if (isReadOnlyRuntime) return { items: [], limit: safeLimit, offset: 0, hasMore: false };

  const normalizedStatus = clean(options.status) ? normalizeStatus(options.status) : '';
  const requests = await readClaimRequestsFromFile();
  const filtered = normalizedStatus ? requests.filter((request) => request.status === normalizedStatus) : requests;
  const items = filtered.slice(safeOffset, safeOffset + safeLimit).map((request) => normalizeClaimRequestListItem(request));
  return {
    items,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: filtered.length > safeOffset + safeLimit
  };
}

export async function readClaimRequestById(id) {
  const cleanId = clean(id);
  if (!cleanId) return null;
  if (hasSupabase) return readClaimRequestByIdFromSupabase(cleanId);
  if (isReadOnlyRuntime) return null;
  const requests = await readClaimRequestsFromFile();
  return requests.find((request) => request.id === cleanId) || null;
}

export async function readClaimRequestByOwnerToken(ownerToken) {
  const cleanToken = clean(ownerToken);
  if (!cleanToken) return null;
  if (hasSupabase) {
    return readClaimRequestByTokenFromSupabase('owner_token', cleanToken, 'Lettura claim owner non riuscita');
  }
  if (isReadOnlyRuntime) return null;
  const requests = await readClaimRequestsFromFile();
  return requests.find((request) => request.owner_token === cleanToken) || null;
}

export async function readClaimRequestByVerificationToken(verificationToken) {
  const cleanToken = clean(verificationToken);
  if (!cleanToken) return null;
  if (hasSupabase) {
    return readClaimRequestByTokenFromSupabase('verification_token', cleanToken, 'Lettura claim verifica non riuscita');
  }
  if (isReadOnlyRuntime) return null;
  const requests = await readClaimRequestsFromFile();
  return requests.find((request) => request.verification_token === cleanToken) || null;
}

export async function findClaimRequestByOwnerToken(ownerToken) {
  return readClaimRequestByOwnerToken(ownerToken);
}

export async function verifyClaimEmail(verificationToken) {
  const cleanToken = clean(verificationToken);
  if (!cleanToken) throw new Error('Token verifica mancante.');
  const current = await readClaimRequestByVerificationToken(cleanToken);
  if (!current) throw new Error('Token verifica non valido o scaduto.');

  if (current.email_verified_at) return current;

  const patch = {
    email_verified_at: nowIso(),
    updated_at: nowIso()
  };

  if (hasSupabase) return patchClaimRequestInSupabase(current.id, patch);
  if (isReadOnlyRuntime) throw new Error('Verifica non disponibile in questo ambiente.');
  return updateClaimRequestInFile(current.id, patch);
}

export async function updateClaimRequestStatus(id, status, adminNotes = '', extraPatch = {}) {
  const normalizedStatus = normalizeStatus(status);
  if (!['pending', 'in_review', 'approved', 'rejected', 'resolved'].includes(normalizedStatus)) {
    throw new Error('Stato richiesta non valido.');
  }

  const current = await readClaimRequestById(id);
  if (!current) throw new Error('Richiesta non trovata.');

  const patch = {
    ...extraPatch,
    status: normalizedStatus,
    admin_notes: clean(adminNotes) || current.admin_notes,
    updated_at: nowIso()
  };

  if (normalizedStatus === 'approved') {
    patch.approved_at = current.approved_at || nowIso();
    patch.rejected_at = null;
    patch.owner_token = current.owner_token || token();
  }

  if (normalizedStatus === 'rejected') {
    patch.rejected_at = current.rejected_at || nowIso();
  }

  const updated = hasSupabase
    ? await patchClaimRequestInSupabase(current.id, patch)
    : isReadOnlyRuntime
      ? (() => {
          throw new Error('Impossibile aggiornare lo stato in questo ambiente.');
        })()
      : await updateClaimRequestInFile(current.id, patch);

  if (updated?.status === 'approved') {
    try {
      await sendOwnerDashboardEmail(updated);
    } catch {
      // Email failure must not rollback approval.
    }
  }

  return updated;
}

export async function createClaimRequest(input) {
  const request = normalizeClaimRequest({
    ...input,
    status: 'pending',
    verification_token: token(),
    verification_sent_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso()
  });
  let saved;

  if (hasSupabase) {
    saved = await writeClaimRequestToSupabase(request);
  } else {
    if (isReadOnlyRuntime) {
      throw new Error(
        'Il flusso claim non può salvare dati in questo ambiente. Configura Supabase oppure usa un ambiente con scrittura persistente.'
      );
    }
    saved = await writeClaimRequestToFile(request);
  }

  try {
    await sendClaimNotification(saved);
    await sendVerificationEmail(saved);
  } catch {
    // Notification failure must not block the request itself.
  }

  return saved;
}

export async function submitOwnerClaimUpdate(ownerToken, updates) {
  const claim = await findClaimRequestByOwnerToken(ownerToken);
  if (!claim) throw new Error('Dashboard proprietario non trovata.');
  if (claim.status !== 'approved') throw new Error('La richiesta non è ancora approvata.');
  if (!claim.email_verified_at) throw new Error('Email non ancora verificata.');

  const patch = {
    requested_updates: {
      ...(claim.requested_updates && typeof claim.requested_updates === 'object' ? claim.requested_updates : {}),
      ...updates,
      submitted_at: nowIso()
    },
    image_uploads: Array.isArray(updates.image_uploads) ? updates.image_uploads : claim.image_uploads,
    updated_at: nowIso()
  };

  if (hasSupabase) return patchClaimRequestInSupabase(claim.id, patch);
  if (isReadOnlyRuntime) throw new Error('Dashboard non persistente in questo ambiente.');
  return updateClaimRequestInFile(claim.id, patch);
}
