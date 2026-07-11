import { redirect } from '@sveltejs/kit';

// Spostata sotto Acquisizione: le righe nuove ora passano dalla coda di
// revisione gym_candidates invece di scrivere direttamente su gyms (Fase 3, area 5).
// Redirect permanente per bookmark/link esistenti verso questa route.
export function load() {
  throw redirect(308, '/admin/candidati/importa-csv');
}
