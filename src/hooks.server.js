import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  isValidAdminSession
} from '$lib/server/admin-auth';

function redirectResponse(target) {
  return new Response(null, {
    status: 303,
    headers: {
      location: target
    }
  });
}

export async function handle({ event, resolve }) {
  const { pathname, search, hostname } = event.url;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  if (hostname === 'www.palestreinzona.it') {
    const target = `https://palestreinzona.it${pathname}${search}`;
    return new Response(null, {
      status: 308,
      headers: {
        location: target
      }
    });
  }

  if (!isAdminRoute) {
    return resolve(event);
  }

  const configured = isAdminConfigured();
  const sessionToken = event.cookies.get(ADMIN_SESSION_COOKIE) || '';
  const authenticated = isValidAdminSession(sessionToken);
  event.locals.admin = {
    configured,
    authenticated
  };

  if (pathname === ADMIN_LOGIN_PATH) {
    if (configured && authenticated) {
      const next = event.url.searchParams.get('next');
      return redirectResponse(next && next.startsWith('/admin') ? next : '/admin');
    }
    return resolve(event);
  }

  if (!configured) {
    return redirectResponse(`${ADMIN_LOGIN_PATH}?setup=1`);
  }

  if (!authenticated) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return redirectResponse(`${ADMIN_LOGIN_PATH}?next=${next}`);
  }

  return resolve(event);
}
