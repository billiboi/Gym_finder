import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function readLatestPreview() {
  try {
    const files = await readdir(DATA_DIR);
    const latest = files
      .filter((file) => /^descriptions-repair-preview-.*\.json$/.test(file))
      .sort()
      .reverse()[0];

    if (!latest) {
      return { hasReport: false, filename: '', generatedAt: '', rows: [], summary: {} };
    }

    const raw = await readFile(path.join(DATA_DIR, latest), 'utf8');
    const report = JSON.parse(raw);
    const rows = Array.isArray(report.rows) ? report.rows : [];

    return {
      hasReport: true,
      filename: latest,
      generatedAt: report.generated_at || '',
      rows: rows.map((row) => ({
        id: clean(row.id),
        slug: clean(row.slug),
        nome: clean(row.nome),
        citta: clean(row.citta),
        indirizzo: clean(row.indirizzo),
        disciplina_principale: clean(row.disciplina_principale),
        priorita: clean(row.priorita),
        risk_score: toNumber(row.risk_score),
        descrizione_attuale: clean(row.descrizione_attuale),
        descrizione_proposta: clean(row.descrizione_proposta),
        motivo_generazione: clean(row.motivo_generazione),
        problemi_rilevati: clean(row.problemi_rilevati),
        needs_review: Boolean(row.needs_review),
        duplicate_risk: clean(row.duplicate_risk),
        quality_score_before: toNumber(row.quality_score_before),
        quality_score_after: toNumber(row.quality_score_after),
        repair_status: clean(row.repair_status),
        azione_consigliata: clean(row.azione_consigliata)
      })),
      summary: {
        preview_rows: toNumber(report.preview_rows),
        needs_review_rows: toNumber(report.needs_review_rows),
        duplicate_risk_rows: toNumber(report.duplicate_risk_rows),
        registry_review_rows: toNumber(report.registry_review_rows),
        description_repairable_rows: toNumber(report.description_repairable_rows),
        average_quality_before: toNumber(report.average_quality_before),
        average_quality_after: toNumber(report.average_quality_after)
      }
    };
  } catch (error) {
    return {
      hasReport: false,
      filename: '',
      generatedAt: '',
      rows: [],
      summary: {},
      error: error instanceof Error ? error.message : 'Errore lettura preview'
    };
  }
}

export async function load() {
  return {
    preview: await readLatestPreview()
  };
}
