import { fail, redirect } from '@sveltejs/kit';
import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  buildAdminSessionToken,
  isAdminConfigured,
  safeAdminRedirectTarget,
  verifyAdminCredentials
} from '$lib/server/admin-auth';

export function load({ url, locals }) {
  const configured = locals.admin?.configured ?? isAdminConfigured();
  const next = safeAdminRedirectTarget(url.searchParams.get('next'));
  const setup = url.searchParams.get('setup') === '1';

  return {
    configured,
    next,
    setup
  };
}

export const actions = {
  default: async ({ request, cookies, url }) => {
    if (!isAdminConfigured()) {
      return fail(503, {
        error:
          'Accesso admin non configurato. Imposta ADMIN_USERNAME e ADMIN_PASSWORD nelle variabili ambiente.'
      });
    }

    const form = await request.formData();
    const username = String(form.get('username') || '').trim();
    const password = String(form.get('password') || '');
    const next = safeAdminRedirectTarget(form.get('next'));

    if (!verifyAdminCredentials(username, password)) {
      return fail(401, {
        error: 'Credenziali non valide.',
        next,
        username
      });
    }

    cookies.set(ADMIN_SESSION_COOKIE, buildAdminSessionToken(), adminCookieOptions(url));
    throw redirect(303, next);
  }
};
