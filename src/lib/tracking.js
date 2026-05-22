import { browser, dev } from '$app/environment';

function clean(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function gymTrackingPayload(gym = {}) {
  return {
    id_scheda: clean(gym?.id),
    slug_scheda: clean(gym?._canonical_slug || gym?.slug),
    nome_palestra: clean(gym?.name || gym?.nome),
    citta: clean(gym?.city || gym?.citta),
    disciplina_principale: clean(
      Array.isArray(gym?.disciplines) && gym.disciplines.length
        ? gym.disciplines[0]
        : String(gym?.discipline || gym?.disciplina || '').split('|')[0]
    )
  };
}

export function trackEvent(eventName, payload = {}) {
  if (!browser || !eventName) return;

  const eventPayload = {
    ...payload,
    pagina_sorgente: window.location.pathname,
    timestamp: new Date().toISOString()
  };

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventPayload);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...eventPayload
      });
    }

    if (dev) {
      console.info('[tracking]', eventName, eventPayload);
    }
  } catch (error) {
    if (dev) {
      console.warn('[tracking] evento non inviato', eventName, error);
    }
  }
}
