import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runContaminationAudit } from './audit-gym-contamination.ts';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = args.get('--out') || `data/fix-gym-contamination-preview-${stamp}.json`;

function severityRank(severity: string) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity] ?? 4;
}

const { payload } = await runContaminationAudit();
const grouped = new Map<string, any>();

for (const issue of payload.issues) {
  const existing = grouped.get(issue.id) || {
    id: issue.id,
    slug: issue.slug,
    legacy_slug: issue.legacy_slug,
    nome: issue.nome,
    citta: issue.citta,
    needs_review: true,
    data_quality_flags: [],
    review_reason: '',
    safe_public_description: issue.safe_public_description,
    hide_suspicious_verified_info: true,
    hide_suspicious_commercial_info: true,
    keep_original_data_for_admin_review: true,
    proposed_patch: {},
    issues: []
  };

  existing.issues.push(issue);
  existing.data_quality_flags.push({
    type: issue.issue_type,
    severity: issue.severity,
    field: issue.campo_sospetto,
    value: issue.valore_sospetto,
    reason: issue.motivo
  });

  grouped.set(issue.id, existing);
}

const proposals = [...grouped.values()].map((proposal) => {
  proposal.data_quality_flags.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  proposal.review_reason = proposal.data_quality_flags
    .slice(0, 3)
    .map((flag) => `${flag.severity}: ${flag.type} su ${flag.field}`)
    .join(' | ');
  proposal.proposed_patch = {
    needs_review: true,
    data_quality_flags: proposal.data_quality_flags,
    review_reason: proposal.review_reason,
    last_data_audit_at: payload.generated_at,
    safe_public_description: proposal.safe_public_description
  };
  return proposal;
});

const preview = {
  generated_at: new Date().toISOString(),
  source_audit: {
    generated_at: payload.generated_at,
    total_records: payload.total_records,
    scanned_records: payload.scanned_records,
    suspicious_gyms: payload.suspicious_gyms,
    severity_summary: payload.severity_summary
  },
  destructive: false,
  writes_database: false,
  note: 'Preview non distruttiva: non modifica Supabase e non cancella dati originali.',
  proposals
};

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');

console.log(`[fix-gym-contamination-preview] proposals=${proposals.length} file=${outFile}`);
