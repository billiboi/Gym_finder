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

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

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

export function canPersistClaimRequests() {
  return hasSupabase || !isReadOnlyRuntime;
}

export async function createClaimRequest(input) {
  const request = normalizeClaimRequest(input);

  if (hasSupabase) {
    return writeClaimRequestToSupabase(request);
  }

  if (isReadOnlyRuntime) {
    throw new Error(
      'Il flusso richieste non puo salvare dati in questo ambiente. Configura Supabase oppure usa un ambiente con scrittura persistente.'
    );
  }

  return writeClaimRequestToFile(request);
}
