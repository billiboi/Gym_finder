<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { dedupeDisciplines, normalizeDisciplineLabel } from '$lib/disciplines';
  const THEME_KEY = 'gymfinder-theme';
  let theme = 'light';

  function applyTheme(next) {
    theme = next;
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('theme-dark', theme === 'dark');
      if (document.body) {
        document.body.dataset.theme = theme;
        document.body.classList.toggle('theme-dark', theme === 'dark');
      }
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // ignore
      }
    }
  }

  function toggleTheme() {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }
  import { isGymOpenNow } from '$lib/hours';

  const disciplineStyle = {
    Boxe: { bg: '#7f1d1d', fg: '#fee2e2', icon: 'BOX' },
    Kickboxe: { bg: '#9a3412', fg: '#ffedd5', icon: 'KBX' },
    'Muay Thai': { bg: '#7c2d12', fg: '#ffedd5', icon: 'MT' },
    K1: { bg: '#991b1b', fg: '#fee2e2', icon: 'K1' },
    MMA: { bg: '#1e293b', fg: '#e2e8f0', icon: 'MMA' },
    Judo: { bg: '#0f172a', fg: '#e2e8f0', icon: 'JUD' },
    JiuJitsu: { bg: '#0b3b2e', fg: '#dcfce7', icon: 'BJJ' },
    'JiuJitsu Brasiliano': { bg: '#14532d', fg: '#dcfce7', icon: 'BJJ' },
    Karate: { bg: '#374151', fg: '#f3f4f6', icon: 'KAR' },
    Taekwondo: { bg: '#0f766e', fg: '#ccfbf1', icon: 'TKD' },
    Aikido: { bg: '#1d4ed8', fg: '#dbeafe', icon: 'AIK' },
    'Kung Fu': { bg: '#7c2d12', fg: '#ffedd5', icon: 'KF' },
    'Wing Chun': { bg: '#4c1d95', fg: '#ede9fe', icon: 'WC' },
    'Tai Chi': { bg: '#134e4a', fg: '#ccfbf1', icon: 'TC' },
    Scherma: { bg: '#475569', fg: '#f1f5f9', icon: 'SCH' },
    Chanbara: { bg: '#312e81', fg: '#e0e7ff', icon: 'CHN' },
    'Difesa Personale': { bg: '#334155', fg: '#e2e8f0', icon: 'SELF' },
    'Arti Marziali': { bg: '#1f2937', fg: '#f3f4f6', icon: 'AM' },
    CrossFit: { bg: '#1e3a8a', fg: '#dbeafe', icon: 'CF' },
    Pilates: { bg: '#6d28d9', fg: '#ede9fe', icon: 'PIL' },
    Yoga: { bg: '#0f766e', fg: '#ccfbf1', icon: 'YOG' },
    Nuoto: { bg: '#075985', fg: '#e0f2fe', icon: 'SWM' },
    Calisthenics: { bg: '#4b5563', fg: '#f3f4f6', icon: 'CAL' },
    Functional: { bg: '#334155', fg: '#e2e8f0', icon: 'FUN' },
    Bodybuilding: { bg: '#111827', fg: '#f9fafb', icon: 'BB' },
    Fitness: { bg: '#1f2937', fg: '#f3f4f6', icon: 'FIT' }
  };

  function disciplineImageDataUri(discipline) {
    const style = disciplineStyle[discipline] || disciplineStyle.Fitness;
    const title = (discipline || 'Fitness').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="${style.bg}"/><circle cx="1040" cy="120" r="220" fill="rgba(255,255,255,0.08)"/><circle cx="180" cy="560" r="240" fill="rgba(255,255,255,0.06)"/><text x="80" y="300" fill="${style.fg}" font-size="58" font-family="Arial, sans-serif" font-weight="700">${title}</text><text x="80" y="390" fill="${style.fg}" font-size="112">${style.icon}</text><text x="80" y="455" fill="${style.fg}" font-size="34" opacity="0.8">Gym Finder</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function imageForGym(gym) {
    if (gym.image_url && String(gym.image_url).startsWith('/uploads/')) {
      return gym.image_url;
    }
    return disciplineImageDataUri(primaryDisciplineForGym(gym));
  }
  function disciplineListForGym(gym) {
    if (Array.isArray(gym.disciplines) && gym.disciplines.length) {
      return gym.disciplines.map((d) => normalizeDisciplineLabel(d)).filter(Boolean);
    }
    if (typeof gym.discipline === 'string' && gym.discipline.trim()) {
      return gym.discipline
        .split('|')
        .map((d) => normalizeDisciplineLabel(d))
        .filter(Boolean);
    }
    return ['Fitness'];
  }

  function primaryDisciplineForGym(gym) {
    return disciplineListForGym(gym)[0] || 'Fitness';
  }

  function fixMojibake(value) {
    let text = String(value || '');
    if (!text) return '';

    const replacements = [
      ['Ãƒâ‚¬', 'Ã€'], ['ÃƒË†', 'Ãˆ'], ['Ãƒâ€°', 'Ã‰'], ['ÃƒÅ’', 'ÃŒ'], ['Ãƒâ€™', 'Ã’'], ['Ãƒâ„¢', 'Ã™'],
      ['ÃƒÂ ', 'Ã '], ['ÃƒÂ¨', 'Ã¨'], ['ÃƒÂ©', 'Ã©'], ['ÃƒÂ¬', 'Ã¬'], ['ÃƒÂ²', 'Ã²'], ['ÃƒÂ¹', 'Ã¹'],
      ['ÃƒÂ¶', 'Ã¶'], ['ÃƒÂ¤', 'Ã¤'], ['ÃƒÅ¸', 'ÃŸ'], ['Ãƒâ€“', 'Ã–'], ['ÃƒÂ¼', 'Ã¼'], ['ÃƒÅ“', 'Ãœ'],
      ['Ã¢â‚¬â€œ', '-'], ['Ã¢â‚¬â€', '-'], ['Ã¢â‚¬Ëœ', "'"], ['Ã¢â‚¬â„¢', "'"], ['Ã¢â‚¬Å“', '"'], ['Ã¢â‚¬Â', '"'],
      ['Ã‚', '']
    ];

    for (const [from, to] of replacements) {
      text = text.split(from).join(to);
    }

    return text.replace(/\s+/g, ' ').trim();
  }

  function displayName(value) {
    return fixMojibake(value);
  }

  function formatAddressForDisplay(gym) {
    const raw = fixMojibake([gym?.address, gym?.city].filter(Boolean).join(', '));
    if (!raw) return 'Indirizzo non disponibile';

    let parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return 'Indirizzo non disponibile';

    const countryTokens = ['italia', 'svizzera', 'suisse', 'schweiz', 'svizra'];
    while (parts.length > 1 && countryTokens.includes(parts[parts.length - 1].toLowerCase())) {
      parts = parts.slice(0, -1);
    }

    const street = parts[0] || '';
    const remaining = parts.slice(1);
    const cityProvRaw = remaining.length ? remaining[remaining.length - 1] : '';
    const cityProv = cityProvRaw.replace(/\b\d{4,5}\b/g, '').replace(/\s+/g, ' ').trim();

    if (street && cityProv) return street + ', ' + cityProv;
    if (street) return street;
    return cityProv || 'Indirizzo non disponibile';
  }
  let gyms = [];
  let filteredGyms = [];
  let disciplines = [];

  let filterText = '';
  let filterDiscipline = '';
  let filterOpenState = 'all';

  let userLocation = null;
  let locating = false;
  let locationError = '';
  let locationRadius = 20;
  let nearbyOnly = true;

  let mapContainer;
  let mapInstance = null;
  let markersLayer = null;
  let userMarker = null;
  let radiusCircle = null;

  $: {
  filterText;
  filterDiscipline;
  filterOpenState;
  userLocation;
  nearbyOnly;
  locationRadius;
  filteredGyms = filterClientGyms(gyms);
}
  $: totalGyms = filteredGyms.length;
  $: disciplineCount = disciplines.length;
  $: locationReady = Boolean(userLocation);

  let csvGymsCache = null;

  function splitCsvLine(line, delimiter = ',') {
    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1];

      if (ch === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === delimiter && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }

      cur += ch;
    }

    out.push(cur);
    return out;
  }

  function parseCsvGyms(text) {
    const lines = String(text || '')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '');

    if (lines.length <= 1) return [];

    const header = splitCsvLine(lines[0], ',').map((h) => h.trim().toLowerCase());
    const idx = {
      name: header.indexOf('nome palestra'),
      disciplines: header.indexOf('discipline'),
      address: header.indexOf('indirizzo'),
      phone: header.indexOf('telefono'),
      hours: header.indexOf('orari di apertura'),
      website: header.indexOf('pagina web'),
      lat: header.indexOf('lat'),
      long: header.indexOf('long')
    };

    return lines
      .slice(1)
      .map((line, i) => {
        const c = splitCsvLine(line, ',');
        const fullAddress = String(c[idx.address] || '').trim();
        const parts = fullAddress.split(',').map((p) => p.trim()).filter(Boolean);
        const address = parts.length > 1 ? parts.slice(0, -1).join(', ') : fullAddress;
        const city = parts.length > 1 ? parts[parts.length - 1] : '';
        const discipline = String(c[idx.disciplines] || '').trim();
        const latitude = Number(String(c[idx.lat] || '').trim());
        const longitude = Number(String(c[idx.long] || '').trim());

        return {
          id: `csv-${i + 1}`,
          name: String(c[idx.name] || '').trim(),
          discipline,
          disciplines: discipline
            .split('|')
            .map((d) => d.trim())
            .filter(Boolean),
          address,
          city,
          phone: String(c[idx.phone] || '').trim(),
          hours_info: String(c[idx.hours] || '').trim() || 'Orari da verificare',
          website: String(c[idx.website] || '').trim(),
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null
        };
      })
      .filter((g) => g.name);
  }

  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function filterClientGyms(list) {
    const q = filterText.trim().toLowerCase();
    const d = filterDiscipline.trim().toLowerCase();
    const openState = filterOpenState.trim().toLowerCase();
    let out = list.map((gym) => ({ ...gym, is_open_now: isGymOpenNow(gym.hours_info) }));

    if (d) {
      out = out.filter((gym) => disciplineListForGym(gym).map((x) => x.toLowerCase()).includes(d));
    }

    if (openState === 'open') {
      out = out.filter((gym) => gym.is_open_now === true);
    }

    if (openState === 'closed') {
      out = out.filter((gym) => gym.is_open_now === false);
    }

    if (q) {
      out = out.filter((gym) =>
        [gym.name, gym.address, gym.city, disciplineListForGym(gym).join(' | ')]
          .some((field) => String(field || '').toLowerCase().includes(q))
      );
    }

    if (userLocation) {
      out = out
        .map((gym) => {
          const lat = Number(gym.latitude);
          const lng = Number(gym.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...gym, distance_km: null };
          const distance = haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
          return { ...gym, distance_km: Math.round(distance * 10) / 10 };
        })
        .filter((gym) => !nearbyOnly || (gym.distance_km !== null && gym.distance_km <= locationRadius))
        .sort((a, b) => {
          if (a.distance_km === null && b.distance_km === null) return a.name.localeCompare(b.name, 'it');
          if (a.distance_km === null) return 1;
          if (b.distance_km === null) return -1;
          return a.distance_km - b.distance_km;
        });
    } else {
      out = out.sort((a, b) => a.name.localeCompare(b.name, 'it'));
    }

    return out;
  }

  async function getCsvGyms() {
    if (Array.isArray(csvGymsCache)) return csvGymsCache;
    const res = await fetch('/palestre.csv');
    if (!res.ok) return [];
    const text = await res.text();
    csvGymsCache = parseCsvGyms(text);
    return csvGymsCache;
  }
  async function loadGyms() {
    try {
      const res = await fetch('/api/gyms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          gyms = data;
          return;
        }
      }
    } catch {
      // fallback below
    }

    const csvGyms = await getCsvGyms();
    gyms = csvGyms;
  }
  async function loadDisciplines() {
    try {
      const res = await fetch('/api/disciplines');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          disciplines = dedupeDisciplines(data);
          return;
        }
      }
    } catch {
      // fallback below
    }

    const csvGyms = await getCsvGyms();
    disciplines = dedupeDisciplines(csvGyms.flatMap((gym) => disciplineListForGym(gym)));
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      locationError = 'Geolocalizzazione non supportata dal browser.';
      return;
    }

    locating = true;
    locationError = '';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        locating = false;
        await loadGyms();
      },
      (error) => {
        locating = false;
        locationError = error?.message || 'Impossibile ottenere la posizione.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clearLocation() {
    userLocation = null;
    locationError = '';
    loadGyms();
  }

  async function ensureLeaflet() {
    if (typeof window === 'undefined') return;
    if (window.L) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    await new Promise((resolve, reject) => {
      if (document.getElementById('leaflet-js')) {
        if (window.L) resolve();
        else document.getElementById('leaflet-js').addEventListener('load', resolve, { once: true });
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
  }

  function refreshMap() {
    if (!mapInstance || !window.L) return;

    markersLayer.clearLayers();

    for (const gym of filteredGyms) {
      const lat = Number(gym.latitude);
      const lng = Number(gym.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const distance = gym.distance_km !== null && gym.distance_km !== undefined ? `${gym.distance_km} km` : '-';
      const rawAddress = formatAddressForDisplay(gym);
      const escapedName = String(gym.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePrefix = new RegExp(`^${escapedName}\\s*,\\s*`, 'i');
      const fullAddress = (rawAddress ? rawAddress.replace(namePrefix, '') : '') || 'Indirizzo non disponibile';

      window.L.marker([lat, lng])
        .bindPopup(`<div style="min-width:220px;line-height:1.35"><div style="font-weight:800;font-size:14px;margin-bottom:6px">${gym.name}</div><div><span style="font-weight:700">Disciplina:</span> <span style="font-weight:600">${disciplineListForGym(gym).join(" | ") }</span></div><div><span style="font-weight:700">Indirizzo:</span> ${fullAddress}</div><div><span style="font-weight:700">Distanza:</span> <span style="font-weight:700">${distance}</span></div></div>`)
        .addTo(markersLayer);
    }

    if (userMarker) {
      mapInstance.removeLayer(userMarker);
      userMarker = null;
    }

    if (radiusCircle) {
      mapInstance.removeLayer(radiusCircle);
      radiusCircle = null;
    }

    if (userLocation) {
      userMarker = window.L.marker([userLocation.latitude, userLocation.longitude], {
        title: 'La tua posizione'
      }).addTo(mapInstance);

      if (nearbyOnly) {
        radiusCircle = window.L.circle([userLocation.latitude, userLocation.longitude], {
          radius: locationRadius * 1000,
          color: '#2563eb',
          weight: 2,
          fillColor: '#60a5fa',
          fillOpacity: 0.15
        }).addTo(mapInstance);
      }

      mapInstance.setView([userLocation.latitude, userLocation.longitude], 11);
    }
  }

  async function initMap() {
    if (mapInstance || !mapContainer) return;

    await ensureLeaflet();

    mapInstance = window.L.map(mapContainer).setView([45.8206, 8.825], 9);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    markersLayer = window.L.layerGroup().addTo(mapInstance);
    refreshMap();
  }

  $: if (mapInstance) {
    refreshMap();
  }

  onMount(async () => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage ? window.localStorage.getItem(THEME_KEY) : null;
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(stored || (prefersDark ? 'dark' : 'light'));
    }

    await Promise.all([loadGyms(), loadDisciplines()]);
    await initMap();
  });

  afterUpdate(() => {
    if (mapInstance && markersLayer) {
      refreshMap();
    }
  });

  onDestroy(() => {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
  });
</script>

<div class="min-h-screen w-full sc-page relative">
  <header class="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/80 px-4 py-3 shadow-lg backdrop-blur-sm sc-panel sc-header">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Gym Finder</p>
        <p class="text-sm text-slate-600">Directory palestre e arti marziali in Ticino e dintorni.</p>
      </div>
      <button type="button" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 sc-button-ghost" on:click={toggleTheme} data-testid="theme-toggle">
        {theme === 'dark' ? 'Light' : 'Dark'} theme
      </button>
    </div>
  </header>

  <main class="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
  <section class="reveal rounded-3xl border border-white/80 bg-white/70 p-5 shadow-xl backdrop-blur-sm sm:p-7 sc-panel sc-hero">


    <div class="mt-2 flex flex-wrap items-end justify-between gap-5">
      <div class="max-w-3xl">
        <h1 class="text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">Trova la palestra pi&ugrave; vicina a te</h1>
        <p class="mt-3 text-sm text-slate-600 sm:text-base">Pensata per utenti in viaggio o appena trasferiti: cerca per posizione, tipologia e distanza.</p>
      </div>
      <div class="grid min-w-[220px] grid-cols-2 gap-2 text-center text-xs sm:text-sm">
        <div class="rounded-2xl sc-stat px-3 py-2 text-white">
          <p class="text-lg font-bold">{totalGyms}</p>
          <p class="opacity-75">Risultati</p>
        </div>
        <div class="rounded-2xl sc-stat sc-stat--accent px-3 py-2 text-white">
          <p class="text-lg font-bold">{disciplineCount}</p>
          <p class="opacity-75">Discipline</p>
        </div>
      </div>
    </div>
  </section>

  <section class="reveal mt-5 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-5 sc-panel">
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <input
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2 lg:col-span-2 sc-input"
        placeholder="Cerca per nome o zona"
        bind:value={filterText}
        on:input={loadGyms}
      />

      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input"
        bind:value={filterDiscipline}
        on:change={loadGyms}
      >
        <option value="">Tutte le discipline</option>
        {#each disciplines as discipline}
          <option value={discipline}>{discipline}</option>
        {/each}
      </select>

      <select
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input"
        bind:value={filterOpenState}
        on:change={loadGyms}
      >
        <option value="all">Aperte e chiuse</option>
        <option value="open">Aperte adesso</option>
        <option value="closed">Chiuse adesso</option>
      </select>

      <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sc-pill">
        <input type="checkbox" bind:checked={nearbyOnly} on:change={loadGyms} />
        Nel raggio
      </label>

      <select class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input" bind:value={locationRadius} on:change={loadGyms}>
        <option value={5}>5 km</option>
        <option value={10}>10 km</option>
        <option value={20}>20 km</option>
        <option value={30}>30 km</option>
        <option value={50}>50 km</option>
      </select>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 sc-button" on:click={detectLocation} disabled={locating}>
        {locating ? 'Rilevamento posizione...' : 'Usa la mia posizione'}
      </button>
      {#if locationReady}
        <button type="button" class="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 sc-button-muted" on:click={clearLocation}>
          Rimuovi posizione
        </button>
      {/if}
      {#if locationReady}
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ordinamento per vicinanza attivo</span>
      {/if}
    </div>

    {#if locationError}
      <p class="mt-3 text-sm font-semibold text-red-700">{locationError}</p>
    {/if}
  </section>

  <section class="mt-5 overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-lg sc-panel sc-map">
    <div class="border-b border-slate-200 px-4 py-3">
      <h2 class="text-lg font-bold text-slate-900">Mappa palestre</h2>
      <p class="text-sm text-slate-500">Marker ordinati in base ai filtri attivi e alla tua posizione.</p>
    </div>
    <div bind:this={mapContainer} class="h-[420px] w-full"></div>
  </section>

  <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#if filteredGyms.length === 0}
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <p class="text-slate-500">Nessuna palestra trovata con i filtri selezionati.</p>
      </div>
    {:else}
      {#each filteredGyms as gym, i}
        <article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sc-card" style={`animation-delay:${i * 20}ms`}>
          <div class="relative h-44 overflow-hidden">
            <img src={imageForGym(gym)} alt={`Immagine ${gym.name}`} class="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
            <span class="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-bold text-white sc-badge sc-badge--accent">{disciplineListForGym(gym).join(" | ") }</span>
            {#if gym.distance_km !== null && gym.distance_km !== undefined}
              <span class="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white sc-badge">{gym.distance_km} km</span>
            {/if}
            <span class="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold text-white sc-badge {gym.is_open_now === true ? 'sc-badge--open' : gym.is_open_now === false ? 'sc-badge--closed' : 'bg-slate-500'}">
              {gym.is_open_now === true ? 'Aperta ora' : gym.is_open_now === false ? 'Chiusa ora' : 'Stato orario n/d'}
            </span>
          </div>

          <div class="space-y-2 p-3">
            <h3 class="text-lg font-bold text-slate-900">{displayName(gym.name)}</h3>
            <p class="text-sm text-slate-700"><strong>Indirizzo:</strong> {formatAddressForDisplay(gym)}</p>
            <p class="text-sm text-slate-700"><strong>Orari:</strong> {displayName(gym.hours_info)}</p>
            <p class="text-sm text-slate-700"><strong>Telefono:</strong> {displayName(gym.phone) || '-'}</p>
            <p class="text-sm text-slate-700">
              <strong>Sito:</strong>
              {#if gym.website}
                <a href={gym.website} target="_blank" rel="noreferrer" class="font-semibold text-blue-700 underline decoration-2 underline-offset-2">Apri sito</a>
              {:else}
                -
              {/if}
            </p>
          </div>
        </article>
      {/each}
    {/if}
  </section>
  </main>

  <footer class="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
    <div class="rounded-3xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-500 shadow-lg backdrop-blur-sm sc-panel">
      Gym Finder · Ricerca palestre e arti marziali · © 2026
    </div>
  </footer>
</div>


