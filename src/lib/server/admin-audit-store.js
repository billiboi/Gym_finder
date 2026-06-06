const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

function supabaseBaseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra
  };
}

function readableAuditError(status, details) {
  return [
    `Lettura audit log non riuscita (${status}).`,
    details,
    'Suggerimento: verifica che la migration hardening sia applicata e che SUPABASE_SERVICE_ROLE_KEY abbia accesso server-side.'
  ]
    .filter(Boolean)
    .join(' ');
}

function boundedNumber(value, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

export async function readAdminAuditLogList({ limit = 30, offset = 0 } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return {
      entries: [],
      error: 'Audit log non disponibile: variabili Supabase server-side mancanti.'
    };
  }

  const safeLimit = boundedNumber(limit, 30, { min: 1, max: 100 });
  const safeOffset = boundedNumber(offset, 0, { min: 0 });
  const params = new URLSearchParams({
    select: 'id,created_at,actor,action,table_name,record_id',
    order: 'created_at.desc',
    limit: String(safeLimit),
    offset: String(safeOffset)
  });

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/admin_audit_log?${params}`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
    } catch {
      details = await response.text().catch(() => '');
    }

    return {
      entries: [],
      error: readableAuditError(response.status, details)
    };
  }

  const payload = await response.json();
  return {
    entries: Array.isArray(payload) ? payload : [],
    error: ''
  };
}

export async function readAdminAuditLogEntry(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return {
      entry: null,
      error: 'Audit log non disponibile: variabili Supabase server-side mancanti.'
    };
  }

  const cleanId = String(id || '').trim();
  if (!cleanId) return { entry: null, error: 'ID audit log mancante.' };

  const params = new URLSearchParams({
    select: 'id,created_at,actor,action,table_name,record_id,before_data,after_data',
    id: `eq.${cleanId}`,
    limit: '1'
  });

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/admin_audit_log?${params}`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
    } catch {
      details = await response.text().catch(() => '');
    }

    return {
      entry: null,
      error: readableAuditError(response.status, details)
    };
  }

  const payload = await response.json();
  return {
    entry: Array.isArray(payload) && payload.length ? payload[0] : null,
    error: ''
  };
}

export async function readAdminAuditLog(options = {}) {
  return readAdminAuditLogList(options);
}

export async function writeAdminAuditLog({ actor = 'admin', action, tableName = 'gyms', recordId, beforeData, afterData }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Audit log non disponibile: variabili Supabase server-side mancanti.');
  }

  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify({
      actor,
      action,
      table_name: tableName,
      record_id: String(recordId || ''),
      before_data: beforeData || null,
      after_data: afterData || null
    })
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(' ');
    } catch {
      details = await response.text().catch(() => '');
    }

    throw new Error(`Scrittura audit log non riuscita (${response.status}). ${details}`.trim());
  }
}
