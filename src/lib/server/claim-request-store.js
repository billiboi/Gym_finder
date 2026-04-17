import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dataDir = path.join(process.cwd(), 'data');
const claimRequestsFilePath = path.join(dataDir, 'claim-requests.json');
const isReadOnlyRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';
const SUPABASE_CLAIMS_TABLE = process.env.SUPABASE_CLAIMS_TABLE || 'claim_requests';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const CLAIM_NOTIFICATION_TO =
  process.env.CLAIM_NOTIFICATION_TO || process.env.SITE_CONTACT_EMAIL || 'vdauria94@gmail.com';
const CLAIM_NOTIFICATION_FROM =
  process.env.CLAIM_NOTIFICATION_FROM || 'Palestre in Zona <onboarding@resend.dev>';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
const hasResend = Boolean(RESEND_API_KEY && CLAIM_NOTIFICATION_TO && CLAIM_NOTIFICATION_FROM);

function clean(value) {
  return String(value ?? '').trim();
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

async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(claimRequestsFilePath, 'utf-8');
  } catch {
    await writeFile(claimRequestsFilePath, '[]', 'utf-8');
  }
}

function normalizeClaimRequest(input) {
  return {
    id: clean(input?.id) || `claim-${randomUUID()}`,
    gym_name: clean(input?.gym_name),
    gym_url: clean(input?.gym_url),
    reason: clean(input?.reason) || 'Aggiornamento dati',
    requester_name: clean(input?.requester_name),
    requester_role: clean(input?.requester_role),
    requester_email: clean(input?.requester_email),
    requester_phone: clean(input?.requester_phone),
    message: clean(input?.message),
    status: clean(input?.status) || 'new',
    created_at: clean(input?.created_at) || new Date().toISOString()
  };
}

async function writeClaimRequestToSupabase(request) {
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}`, {
    method: 'POST',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify([request])
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = String(payload?.message || payload?.hint || '').trim();
    } catch {
      details = '';
    }

    if (response.status === 404 || response.status === 400) {
      throw new Error(
        `Claim flow non configurato su Supabase: crea la tabella "${SUPABASE_CLAIMS_TABLE}" oppure configura SUPABASE_CLAIMS_TABLE correttamente. ${details}`.trim()
      );
    }

    throw new Error(`Salvataggio richiesta fallito (${response.status}). ${details}`.trim());
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? normalizeClaimRequest(rows[0]) : request;
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

async function updateClaimRequestInSupabase(id, patch) {
  const response = await fetch(
    `${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(patch)
    }
  );

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = String(payload?.message || payload?.hint || '').trim();
    } catch {
      details = '';
    }

    throw new Error(`Aggiornamento richiesta fallito (${response.status}). ${details}`.trim());
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

  if (index < 0) {
    throw new Error('Richiesta non trovata.');
  }

  next[index] = normalizeClaimRequest({
    ...next[index],
    ...patch
  });

  await writeFile(claimRequestsFilePath, JSON.stringify(next, null, 2), 'utf-8');
  return next[index];
}

async function sendClaimNotification(request) {
  if (!hasResend) return;

  const subject = `Nuova richiesta palestra: ${request.gym_name || 'Scheda senza nome'}`;
  const text = [
    'Nuova richiesta ricevuta da Palestre in Zona',
    '',
    `ID: ${request.id}`,
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

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: CLAIM_NOTIFICATION_FROM,
      to: [CLAIM_NOTIFICATION_TO],
      subject,
      text
    })
  });
}

export function canPersistClaimRequests() {
  return hasSupabase || !isReadOnlyRuntime;
}

async function readClaimRequestsFromSupabase() {
  const response = await fetch(
    `${supabaseBaseUrl()}/rest/v1/${SUPABASE_CLAIMS_TABLE}?select=*&order=created_at.desc`,
    {
      method: 'GET',
      headers: supabaseHeaders()
    }
  );

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = String(payload?.message || payload?.hint || '').trim();
    } catch {
      details = '';
    }

    throw new Error(`Lettura richieste fallita (${response.status}). ${details}`.trim());
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows.map((row) => normalizeClaimRequest(row)) : [];
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
    return readClaimRequestsFromSupabase();
  }

  if (isReadOnlyRuntime) {
    return [];
  }

  return readClaimRequestsFromFile();
}

export async function updateClaimRequestStatus(id, status) {
  const normalizedStatus = clean(status).toLowerCase();
  if (!['new', 'reviewed', 'resolved'].includes(normalizedStatus)) {
    throw new Error('Stato richiesta non valido.');
  }

  if (hasSupabase) {
    return updateClaimRequestInSupabase(id, { status: normalizedStatus });
  }

  if (isReadOnlyRuntime) {
    throw new Error('Impossibile aggiornare lo stato in questo ambiente.');
  }

  return updateClaimRequestInFile(id, { status: normalizedStatus });
}

export async function createClaimRequest(input) {
  const request = normalizeClaimRequest(input);
  let saved;

  if (hasSupabase) {
    saved = await writeClaimRequestToSupabase(request);
  } else {
    if (isReadOnlyRuntime) {
      throw new Error(
        'Il flusso richieste non può salvare dati in questo ambiente. Configura Supabase oppure usa un ambiente con scrittura persistente.'
      );
    }

    saved = await writeClaimRequestToFile(request);
  }

  try {
    await sendClaimNotification(saved);
  } catch {
    // Notification failure must not block the request itself.
  }

  return saved;
}

