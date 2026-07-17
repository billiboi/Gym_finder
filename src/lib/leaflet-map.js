export async function ensureLeaflet() {
  if (typeof window === 'undefined') return;
  if (window.L && window.L.markerClusterGroup) return;

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  if (!document.getElementById('leaflet-markercluster-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-markercluster-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    document.head.appendChild(link);
  }

  if (!document.getElementById('leaflet-markercluster-default-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-markercluster-default-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    document.head.appendChild(link);
  }

  await new Promise((resolve, reject) => {
    const existing = document.getElementById('leaflet-js');
    if (existing) {
      if (window.L) resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  await new Promise((resolve, reject) => {
    const existing = document.getElementById('leaflet-markercluster-js');
    if (existing) {
      if (window.L?.markerClusterGroup) resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-markercluster-js';
    script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
  return window.L.divIcon({
    html: `<span>${count}</span>`,
    className: `sc-marker-cluster sc-marker-cluster--${size}`,
    iconSize: window.L.point(size === 'large' ? 58 : size === 'medium' ? 50 : 42, size === 'large' ? 58 : size === 'medium' ? 50 : 42)
  });
}

export function createUserLocationIcon() {
  return window.L.divIcon({
    html: '<span class="sc-user-location-dot"></span>',
    className: 'sc-user-location-icon',
    iconSize: window.L.point(18, 18)
  });
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
