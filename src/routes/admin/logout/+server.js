import { redirect } from '@sveltejs/kit';
import { ADMIN_LOGIN_PATH, ADMIN_SESSION_COOKIE, adminCookieOptions } from '$lib/server/admin-auth';

export async function POST({ cookies, url }) {
  cookies.delete(ADMIN_SESSION_COOKIE, {
    ...adminCookieOptions(url),
    maxAge: undefined
  });

  throw redirect(303, `${ADMIN_LOGIN_PATH}?logged_out=1`);
}
