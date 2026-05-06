import { readFile } from 'node:fs/promises';
import path from 'node:path';

const tokenEnvFile =
  process.argv
    .find((arg) => arg.startsWith('--token-env-file='))
    ?.split('=')
    .slice(1)
    .join('=') || '.env.vercel.local';

function parseEnvValue(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = parseEnvValue(trimmed.slice(index + 1));
    if (key) env[key] = value;
  }
  return env;
}

function required(map, key) {
  const value = map[key] || process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

async function vercelGet(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = payload?.error?.message || payload?.message || JSON.stringify(payload);
    } catch {
      details = await response.text().catch(() => '');
    }
    throw new Error(`Vercel request failed (${response.status}). ${details}`);
  }
  return response.json();
}

const tokenEnv = await loadEnvFile(path.resolve(tokenEnvFile));
const token = required(tokenEnv, 'VERCEL_TOKEN');
const project = JSON.parse(await readFile(path.resolve('.vercel/project.json'), 'utf8'));
const projectId = project.projectId;
const teamId = project.orgId;

const deploymentsUrl = new URL('https://api.vercel.com/v6/deployments');
deploymentsUrl.searchParams.set('teamId', teamId);
deploymentsUrl.searchParams.set('projectId', projectId);
deploymentsUrl.searchParams.set('limit', '20');

const payload = await vercelGet(deploymentsUrl, token);
const deployments = Array.isArray(payload?.deployments) ? payload.deployments : [];
const preview = deployments.find((deployment) => deployment.target !== 'production');

if (!preview) {
  console.log('[vercel-preview-status] no_preview_deployment_found=true');
  process.exit(0);
}

const url = preview.url?.startsWith('http') ? preview.url : `https://${preview.url}`;
console.log(`[vercel-preview-status] id=${preview.uid}`);
console.log(`[vercel-preview-status] state=${preview.state}`);
console.log(`[vercel-preview-status] target=${preview.target || 'preview'}`);
console.log(`[vercel-preview-status] url=${url}`);
