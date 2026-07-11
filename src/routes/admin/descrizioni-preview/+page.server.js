import { redirect } from '@sveltejs/kit';

// Spostata sotto Qualità come sotto-sezione (Fase 3, area 4).
// Redirect permanente per bookmark/link esistenti verso questa route.
export function load() {
  throw redirect(308, '/admin/qualita/descrizioni');
}
