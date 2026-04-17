import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_LOGOUT_PATH = '/admin/logout';
export const ADMIN_SESSION_COOKIE = 'gymfinder_admin_session';

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_COOKIE_SECRET = String(process.env.ADMIN_COOKIE_SECRET || '').trim();

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ''));
  const rightBuffer = Buffer.from(String(right ?? ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminConfigured() {
  return Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);
}

export function buildAdminSessionToken() {
  if (!isAdminConfigured()) return '';
  const secret = ADMIN_COOKIE_SECRET || `${ADMIN_USERNAME}:${ADMIN_PASSWORD}`;
  return hashValue(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${secret}`);
}

export function verifyAdminCredentials(username, password) {
  if (!isAdminConfigured()) return false;
  return safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD);
}

export function isValidAdminSession(token) {
  if (!isAdminConfigured()) return false;
  const expected = buildAdminSessionToken();
  return Boolean(token) && safeEqual(token, expected);
}

export function adminCookieOptions(url) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 14
  };
}

export function safeAdminRedirectTarget(rawTarget) {
  const target = String(rawTarget || '').trim();
  if (!target.startsWith('/admin')) return '/admin';
  if (target.startsWith('//')) return '/admin';
  return target;
}
