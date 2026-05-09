import { redirect } from '@sveltejs/kit';
import { verifyClaimEmail } from '$lib/server/claim-request-store';

export async function GET({ params }) {
  try {
    await verifyClaimEmail(params.token);
    throw redirect(303, '/rivendica-scheda?verified=1');
  } catch (error) {
    if (error?.status && error?.location) throw error;
    const message = encodeURIComponent(error?.message || 'Verifica email non riuscita.');
    throw redirect(303, `/rivendica-scheda?verify_error=${message}`);
  }
}
