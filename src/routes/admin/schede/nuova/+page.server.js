import { redirect } from '@sveltejs/kit';

// Creazione ora vive come modale su /admin/schede?new=1 (Fase 3, area 3).
// Redirect permanente per bookmark/link esistenti verso questa route.
export function load() {
  throw redirect(308, '/admin/schede?new=1');
}
