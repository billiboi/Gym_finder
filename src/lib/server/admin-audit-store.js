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

export async function readAdminAuditLog({ limit = 30 } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return {
      entries: [],
      error: 'Audit log non disponibile: variabili Supabase server-side mancanti.'
    };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const params = new URLSearchParams({
    select: 'id,created_at,actor,action,table_name,record_id,before_data,after_data',
    order: 'created_at.desc',
    limit: String(safeLimit)
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
