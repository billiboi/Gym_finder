import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateGymEditorialPreview } from '../src/lib/gym-editorial-preview.js';

const args = new Map(
  process.argv.slice(2).map((arg, index, all) => {
    if (arg.startsWith('--') && !arg.includes('=')) return [arg, all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : '1'];
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=') || '1'];
  })
);

const gymArg = args.get('--gym') || '';
const envFile = args.get('--env-file') || '.env.staging.local';
const delayMs = args.get('--delay-ms') || '1200';
const timeoutMs = args.get('--timeout-ms') || '5500';
const maxPages = args.get('--max-pages') || '8';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

if (!gymArg) throw new Error('Specifica --gym <slug-or-id>.');

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slugPart(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function markdownFacts(title, facts) {
  if (!facts?.length) return [`## ${title}`, '', 'Nessun dato.'].join('\n');
  const lines = ['| Campo | Valore | Stato | Confidenza |', '|---|---|---|---|'];
  for (const fact of facts) {
    lines.push(`| ${clean(fact.label || fact.field)} | ${clean(fact.value).replace(/\|/g, '/')} | ${clean(fact.status)} | ${clean(fact.confidence)} |`);
  }
  return [`## ${title}`, '', lines.join('\n')].join('\n');
}

function toMarkdown(report) {
  const preview = report.editorial_preview;
  return [
    `# Anteprima editoriale proposta - ${report.app_data.nome}`,
    '',
    `Generato: ${report.generated_at}`,
    `Ambiente: ${report.source.env_file} / ${report.source.target}`,
    `Fonte: ${report.official_source.source_url || 'non disponibile'}`,
    `Livello: ${preview.livello} - ${preview.livello_label}`,
    `Quality score: ${preview.quality_score}`,
    `Needs review: ${preview.needs_review ? 'si' : 'no'}`,
    '',
    '## Descrizione breve proposta',
    '',
    preview.descrizione_breve,
    '',
    '## Descrizione lunga proposta',
    '',
    preview.descrizione_lunga,
    '',
    '## FAQ proposte',
    '',
    preview.faq.length
      ? preview.faq.map((item) => `### ${item.question}\n\n${item.answer}`).join('\n\n')
      : 'Nessuna FAQ proposta.',
    '',
    markdownFacts('Dati usati', preview.used_facts),
    '',
    markdownFacts('Dati esclusi', preview.excluded_facts),
    '',
    '## Warning',
    '',
    preview.warnings.length ? preview.warnings.map((warning) => `- ${warning}`).join('\n') : 'Nessun warning.',
    '',
    '## Note admin',
    '',
    preview.note_admin.map((note) => `- ${note}`).join('\n')
  ].join('\n');
}

const reconcileArgs = [
  process.execPath,
  'scripts/official-reconcile-one.mjs',
  `--env-file=${envFile}`,
  `--gym=${gymArg}`,
  `--delay-ms=${delayMs}`,
  `--timeout-ms=${timeoutMs}`,
  `--max-pages=${maxPages}`
];

const child = Bun.spawn(reconcileArgs, {
  cwd: process.cwd(),
  stdout: 'pipe',
  stderr: 'pipe'
});

const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
if (exitCode !== 0) {
  throw new Error(`Riconciliazione non riuscita.\n${stderr || stdout}`);
}

const reconcileOutput = JSON.parse(stdout);
const reconcileReport = JSON.parse(await readFile(reconcileOutput.jsonOut, 'utf8'));
const editorialPreview = generateGymEditorialPreview(
  reconcileReport.app_data,
  reconcileReport.reconciliation.used_facts || reconcileReport.reconciliation.editorial_eligible || [],
  reconcileReport.reconciliation.excluded_facts || reconcileReport.reconciliation.excluded || []
);
const slug = slugPart(reconcileReport.app_data.slug || reconcileReport.app_data.nome || gymArg);
const jsonOut = `data/official-editorial-preview-${slug}-${stamp}.json`;
const mdOut = `data/official-editorial-preview-${slug}-${stamp}.md`;

const report = {
  generated_at: new Date().toISOString(),
  source: { ...reconcileReport.source, mode: 'editorial_preview_read_only_no_apply' },
  app_data: reconcileReport.app_data,
  official_source: reconcileReport.official_source,
  facts_json: reconcileReport.official_source.facts_json,
  reconciliation: reconcileReport.reconciliation,
  editorial_preview: editorialPreview,
  support_reconcile_report: {
    json: reconcileOutput.jsonOut,
    md: reconcileOutput.mdOut
  }
};

await mkdir(path.dirname(jsonOut), { recursive: true });
await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdOut, `${toMarkdown(report)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      jsonOut,
      mdOut,
      nome: report.app_data.nome,
      livello: editorialPreview.livello,
      quality_score: editorialPreview.quality_score,
      needs_review: editorialPreview.needs_review,
      support_reconcile_json: reconcileOutput.jsonOut
    },
    null,
    2
  )
);
