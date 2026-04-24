<script>
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { dedupeDisciplines, normalizeDisciplineLabel } from '$lib/disciplines';
  import { disciplinePreviewForGym, gymHref, imageForGym } from '$lib/gym-detail';
  import { isGymOpenNow } from '$lib/hours';
  import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';
  import { repairMojibake } from '$lib/text-repair';
  export let data;
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

  function resolveImageSource(gym) {
    const image = imageForGym(gym);
    return typeof image === 'string'
      ? { src: image, candidates: [image], fallback: image }
      : image;
  }

  function handleImageError(event, image) {
    const img = event.currentTarget;
    if (!img || !image) return;

    const candidates = Array.isArray(image.candidates) ? image.candidates : [image.src];
    const nextIndex = Number(img.dataset.imageIndex || '0') + 1;

    if (nextIndex < candidates.length) {
      img.dataset.imageIndex = String(nextIndex);
      img.src = candidates[nextIndex];
      return;
    }

    if (image.fallback && img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.src = image.fallback;
    }
  }

  function displayName(value) {
    return repairMojibake(value).replace(/\s+/g, ' ').trim();
  }

  function formatAddressForDisplay(gym) {
    const raw = displayName([gym?.address, gym?.city].filter(Boolean).join(', '));
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
  let loadingGyms = !Array.isArray(data?.initialGyms);
  let loadingDisciplines = !Array.isArray(data?.initialDisciplines);

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
  let usingMarkerCluster = false;
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
  $: isBootstrapping = loadingGyms || loadingDisciplines;
  $: quickSuggestionPool = buildQuickSuggestionPool(gyms, disciplines);
  $: quickSearchSuggestions = filterQuickSuggestions(quickSuggestionPool, filterText);

  let csvGymsCache = null;

  if (Array.isArray(data?.initialGyms)) {
    gyms = data.initialGyms;
  }

  if (Array.isArray(data?.initialDisciplines)) {
    disciplines = data.initialDisciplines;
  }

  $: homepageTitle = `${SITE_NAME} | Trova palestre vicine, fitness e arti marziali`;
  $: homepageDescription =
    'Cerca palestre vicine, fitness, Pilates, nuoto e arti marziali in Italia e Svizzera con filtri per disciplina, città e distanza.';
  $: featuredGyms = filteredGyms.slice(0, 12);
  $: homeStructuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        description: SITE_DESCRIPTION,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${absoluteUrl('/')}?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Palestre in evidenza',
        itemListElement: featuredGyms.map((gym, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(gymHref(gym)),
          name: displayName(gym.name)
        }))
      }
    ];
  $: homeStructuredDataScript = jsonLdScript(homeStructuredData);

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

  function buildQuickSuggestionPool(allGyms, allDisciplines) {
    const pool = new Map();

    for (const gym of allGyms) {
      const name = displayName(gym.name);
      if (name && !pool.has(name.toLowerCase())) {
        pool.set(name.toLowerCase(), { value: name, type: 'gym' });
      }
    }

    for (const discipline of dedupeDisciplines(allDisciplines)) {
      const value = displayName(discipline);
      if (value && !pool.has(value.toLowerCase())) {
        pool.set(value.toLowerCase(), { value, type: 'discipline' });
      }
    }

    for (const gym of allGyms) {
      const city = displayName(gym.city);
      if (city && !pool.has(city.toLowerCase())) {
        pool.set(city.toLowerCase(), { value: city, type: 'city' });
      }
    }

    return [...pool.values()];
  }

  function filterQuickSuggestions(pool, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const typeWeight = {
      gym: 0,
      discipline: 1,
      city: 2
    };

    return pool
      .map((entry) => {
        const text = entry.value.toLowerCase();
        const startsWith = text.startsWith(q);
        const wordBoundary = new RegExp(`(^|\\s)${q}`).test(text);
        const includes = text.includes(q);

        if (!includes) return null;

        return {
          ...entry,
          score: startsWith ? 0 : wordBoundary ? 1 : 2,
          length: entry.value.length,
          typeScore: typeWeight[entry.type] ?? 9
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (a.typeScore !== b.typeScore) return a.typeScore - b.typeScore;
        if (a.length !== b.length) return a.length - b.length;
        return a.value.localeCompare(b.value, 'it');
      })
      .slice(0, 6)
      .map((entry) => entry.value);
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
    loadingGyms = true;
    try {
      const res = await fetch('/api/gyms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          gyms = data;
          loadingGyms = false;
          return;
        }
      }
    } catch {
      // fallback below
    }

    const csvGyms = await getCsvGyms();
    gyms = csvGyms;
    loadingGyms = false;
  }
  async function loadDisciplines() {
    loadingDisciplines = true;
    try {
      const res = await fetch('/api/disciplines');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          disciplines = dedupeDisciplines(data);
          loadingDisciplines = false;
          return;
        }
      }
    } catch {
      // fallback below
    }

    const csvGyms = await getCsvGyms();
    disciplines = dedupeDisciplines(csvGyms.flatMap((gym) => disciplineListForGym(gym)));
    loadingDisciplines = false;
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      locationError = 'Geolocalizzazione non supportata dal browser.';
      return;
    }

    locating = true;
    locationError = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        locating = false;
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
  }

  async function ensureLeaflet() {
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

  function createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
    return window.L.divIcon({
      html: `<span>${count}</span>`,
      className: `sc-marker-cluster sc-marker-cluster--${size}`,
      iconSize: window.L.point(size === 'large' ? 58 : size === 'medium' ? 50 : 42, size === 'large' ? 58 : size === 'medium' ? 50 : 42)
    });
  }

  function refreshMap() {
    if (!mapInstance || !window.L || !markersLayer) return;

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
      const popupPhone = displayName(gym.phone) || 'Non disponibile';
      const detailHref = gymHref(gym);
      const popupDiscipline = disciplineListForGym(gym).join(' | ');

      window.L.marker([lat, lng])
        .bindPopup(
          `<div class="sc-map-popup">
            <div class="sc-map-popup-title">${gym.name}</div>
            <div class="sc-map-popup-row">
              <span class="sc-map-popup-label">Disciplina</span>
              <span class="sc-map-popup-value">${popupDiscipline}</span>
            </div>
            <div class="sc-map-popup-row">
              <span class="sc-map-popup-label">Indirizzo</span>
              <span class="sc-map-popup-value">${fullAddress}</span>
            </div>
            <div class="sc-map-popup-row">
              <span class="sc-map-popup-label">Distanza</span>
              <span class="sc-map-popup-value sc-map-popup-distance">${distance}</span>
            </div>
            <div class="sc-map-popup-footer">
              <span class="sc-map-popup-contact">${popupPhone}</span>
              <a href="${detailHref}" class="sc-map-popup-link">Scheda completa</a>
            </div>
          </div>`,
          { className: 'sc-map-popup-shell' }
        )
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

    if (window.L?.markerClusterGroup) {
      usingMarkerCluster = true;
      markersLayer = window.L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 42,
        iconCreateFunction: createClusterIcon
      }).addTo(mapInstance);
    } else {
      usingMarkerCluster = false;
      markersLayer = window.L.layerGroup().addTo(mapInstance);
    }
    refreshMap();
  }

  $: if (mapInstance) {
    refreshMap();
  }

  onMount(async () => {
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

<svelte:head>
  <title>{homepageTitle}</title>
  <meta name="description" content={homepageDescription} />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href={absoluteUrl('/')} />
  <meta property="og:title" content={homepageTitle} />
  <meta property="og:description" content={homepageDescription} />
  <meta property="og:url" content={absoluteUrl('/')} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={homepageTitle} />
  <meta name="twitter:description" content={homepageDescription} />
  {@html homeStructuredDataScript}
</svelte:head>

<div class="min-h-screen w-full sc-page relative">
  <main class="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
  <section class="reveal rounded-3xl border border-white/80 bg-white/70 p-5 shadow-xl backdrop-blur-sm sm:p-7 sc-panel sc-hero">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(290px,0.85fr)] lg:items-stretch">
      <div class="flex flex-col justify-between gap-6 sc-hero-copy">
        <div class="max-w-3xl">
        <div class="inline-flex items-center rounded-full border border-emerald-900/10 bg-white/65 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-amber-700">
          Palestre in Zona
        </div>
        <h1 class="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">Trova la palestra giusta, ovunque ti trovi</h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[1.05rem]">
          Una ricerca pi&ugrave; rapida e pulita per trovare palestre, fitness e arti marziali con contatti, filtri utili e risultati davvero facili da confrontare.
        </p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">Ricerca per vicinanza</span>
          <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">Schede complete dedicate</span>
          <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">Esperienza mobile-first</span>
        </div>
        <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <a href="#elenco-palestre" class="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
            Esplora le palestre
          </a>
          <button type="button" class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sc-button-ghost" on:click={detectLocation} disabled={locating}>
            {locating ? 'Rilevamento posizione...' : 'Trova quelle vicine'}
          </button>
        </div>
        <div class="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 sc-hero-benefits">
          <div class="rounded-2xl px-3 py-3 sc-hero-benefit">
            <p class="font-bold text-slate-900">Vai subito al punto</p>
            <p class="mt-1">Filtri semplici e risultati ordinati per essere confrontati in pochi secondi.</p>
          </div>
          <div class="rounded-2xl px-3 py-3 sc-hero-benefit">
            <p class="font-bold text-slate-900">Scopri zone e discipline</p>
            <p class="mt-1">Puoi partire da citt&agrave;, area o sport senza perderti in menu troppo pesanti.</p>
          </div>
          <div class="rounded-2xl px-3 py-3 sc-hero-benefit">
            <p class="font-bold text-slate-900">Usa la posizione</p>
            <p class="mt-1">Quando vuoi, la ricerca locale ti porta subito alle opzioni pi&ugrave; vicine.</p>
          </div>
        </div>
      </div>
      <aside class="rounded-[2rem] p-4 sm:p-5 sc-hero-side">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Inizia da qui</p>
            <h2 class="mt-2 text-2xl font-bold leading-tight text-slate-900">Due modi rapidi per orientarti</h2>
          </div>
          <div class="hidden rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
            Catalogo live
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-3xl px-4 py-4 text-white sc-stat">
            <p class="text-[0.7rem] font-bold uppercase tracking-[0.22em] opacity-70">Risultati</p>
            <p class="mt-3 text-3xl font-bold leading-none">{totalGyms}</p>
            <p class="mt-2 text-sm opacity-80">schede gi&agrave; consultabili</p>
          </div>
          <div class="rounded-3xl px-4 py-4 text-white sc-stat sc-stat--accent">
            <p class="text-[0.7rem] font-bold uppercase tracking-[0.22em] opacity-70">Discipline</p>
            <p class="mt-3 text-3xl font-bold leading-none">{disciplineCount}</p>
            <p class="mt-2 text-sm opacity-80">percorsi da esplorare</p>
          </div>
        </div>

        <div class="mt-4 grid gap-3">
          <a href="/zone" class="rounded-3xl p-4 transition hover:-translate-y-0.5 sc-hero-shortcut">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Parti dalla zona</p>
            <div class="mt-2 flex items-center justify-between gap-3">
              <div>
                <p class="text-lg font-bold text-slate-900">Esplora aree e citt&agrave;</p>
                <p class="mt-1 text-sm leading-6 text-slate-600">Ideale se vuoi vedere rapidamente cosa c&rsquo;&egrave; vicino a te o dove andrai.</p>
              </div>
              <span class="text-xl font-bold text-emerald-800">&rarr;</span>
            </div>
          </a>

          <a href="/discipline" class="rounded-3xl p-4 transition hover:-translate-y-0.5 sc-hero-shortcut">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Parti dalla disciplina</p>
            <div class="mt-2 flex items-center justify-between gap-3">
              <div>
                <p class="text-lg font-bold text-slate-900">Scegli lo sport giusto</p>
                <p class="mt-1 text-sm leading-6 text-slate-600">Boxe, MMA, yoga, fitness e molte altre categorie con pagine dedicate.</p>
              </div>
              <span class="text-xl font-bold text-emerald-800">&rarr;</span>
            </div>
          </a>
        </div>
      </aside>
    </div>
  </section>

  <section class="reveal mt-5 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sm:p-5 sc-panel sc-filter-panel">
    <div class="sc-filter-shell">
      <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Affina i risultati</p>
          <h2 class="mt-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Trova la struttura giusta senza perdere tempo</h2>
          <p class="mt-2 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Cerca per nome o zona, scegli la disciplina e usa la distanza solo quando ti serve davvero.
          </p>
        </div>
        <div class="flex flex-col gap-2 lg:items-end">
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">
              {filterDiscipline || 'Tutte le discipline'}
            </span>
            <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">
              {nearbyOnly ? `Nel raggio ${locationRadius} km` : 'Senza raggio'}
            </span>
            <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">
              {filterOpenState === 'open' ? 'Aperte adesso' : filterOpenState === 'closed' ? 'Chiuse adesso' : 'Aperte e chiuse'}
            </span>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 sc-button" on:click={detectLocation} disabled={locating}>
              {locating ? 'Rilevamento posizione...' : 'Usa la mia posizione'}
            </button>
            {#if locationReady}
              <button type="button" class="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 sc-button-muted" on:click={clearLocation}>
                Rimuovi posizione
              </button>
            {/if}
          </div>
        </div>
      </div>

      <div class="rounded-[1.8rem] p-4 sm:p-5 sc-filter-surface">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] lg:items-end">
          <label class="grid gap-2">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Ricerca principale</span>
            <input
              id="gym-search"
              name="gym-search"
              class="rounded-[1.7rem] border border-slate-200 bg-white px-5 py-4 text-base outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field sc-filter-search"
              placeholder="Cerca per nome, città o zona"
              bind:value={filterText}
              list="quick-search-suggestions"
            />
          </label>
          <datalist id="quick-search-suggestions">
            {#each quickSearchSuggestions as suggestion}
              <option value={suggestion}></option>
            {/each}
          </datalist>

          <div class="rounded-[1.6rem] p-4 sc-filter-local-card">
            <p class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Ricerca locale</p>
            <label class="mt-3 inline-flex min-h-[3.1rem] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 sc-pill sc-filter-toggle">
              <input id="nearby-only" name="nearby-only" type="checkbox" bind:checked={nearbyOnly} />
              Attiva ricerca nel raggio
            </label>
            <p class="mt-3 text-sm leading-6 text-slate-600">Usala quando vuoi dare priorità alle palestre più vicine senza sporcare il resto della ricerca.</p>
          </div>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label class="grid gap-2">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Disciplina</span>
            <select
              id="discipline-filter"
              name="discipline-filter"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
              bind:value={filterDiscipline}
              disabled={loadingDisciplines}
            >
              <option value="">Tutte le discipline</option>
              {#each disciplines as discipline}
                <option value={discipline}>{discipline}</option>
              {/each}
            </select>
          </label>

          <label class="grid gap-2">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Stato</span>
            <select
              id="open-state-filter"
              name="open-state-filter"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
              bind:value={filterOpenState}
            >
              <option value="all">Aperte e chiuse</option>
              <option value="open">Aperte adesso</option>
              <option value="closed">Chiuse adesso</option>
            </select>
          </label>

          <label class="grid gap-2">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Distanza massima</span>
            <select
              id="radius-filter"
              name="radius-filter"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
              bind:value={locationRadius}
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={30}>30 km</option>
              <option value={50}>50 km</option>
            </select>
          </label>

          <div class="grid gap-2">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Stato ricerca</span>
            <div class="flex min-h-[3.25rem] flex-wrap items-center gap-2 rounded-2xl px-3 py-2 sc-filter-meta">
              {#if locationReady}
                <span class="rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 sc-filter-status">Ordinamento per vicinanza attivo</span>
              {/if}
              {#if isBootstrapping}
                <span class="rounded-full sc-loading-pill px-3 py-1 text-xs font-semibold">Aggiornamento risultati...</span>
              {/if}
              {#if !locationReady && !isBootstrapping}
                <span class="text-sm font-medium text-slate-500">Nessun stato attivo</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      {#if quickSearchSuggestions.length}
        <div class="mt-4 rounded-[1.35rem] px-4 py-4 sc-filter-suggestions">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">Suggerimenti rapidi</p>
            <p class="text-sm text-slate-500">Tocca una località o un nome frequente per compilare subito la ricerca.</p>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each quickSearchSuggestions as suggestion}
              <button
                type="button"
                class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold transition hover:bg-white"
                on:click={() => {
                  filterText = suggestion;
                  loadGyms();
                }}
              >
                {suggestion}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if locationError}
        <div class="mt-4 rounded-2xl border border-red-200 bg-red-50/85 px-4 py-3 text-sm font-semibold text-red-700">
          {locationError}
        </div>
      {/if}
    </div>
  </section>

  <section class="mt-5 overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-lg sc-panel sc-map">
    <div class="border-b border-slate-200 px-4 py-4 sm:px-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Mappa palestre</h2>
        </div>
        <div class="rounded-2xl sc-map-chip px-3 py-2 text-xs font-semibold">
          {filteredGyms.length} risultati visibili
        </div>
      </div>
    </div>
    <div class="relative">
      <div class="pointer-events-none absolute inset-x-0 top-0 z-[400] h-16 bg-gradient-to-b from-white/70 to-transparent sc-map-fade"></div>
      <div bind:this={mapContainer} class="h-[420px] w-full sm:h-[460px]"></div>
      {#if isBootstrapping}
        <div class="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
          <div class="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg sc-loading-card">
            Caricamento mappa e palestre...
          </div>
        </div>
      {/if}
    </div>
  </section>

<section id="elenco-palestre" class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#if isBootstrapping && filteredGyms.length === 0}
      {#each Array(6) as _, i}
        <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sc-card sc-skeleton-card" style={`animation-delay:${i * 40}ms`}>
          <div class="h-44 w-full sc-skeleton-block"></div>
          <div class="space-y-3 p-3 sm:p-4">
            <div class="rounded-2xl p-3 sc-skeleton-panel">
              <div class="h-3 w-24 rounded-full sc-skeleton-line"></div>
              <div class="mt-3 h-6 w-2/3 rounded-full sc-skeleton-line"></div>
              <div class="mt-2 h-4 w-full rounded-full sc-skeleton-line"></div>
            </div>
            <div class="grid gap-2">
              <div class="h-10 rounded-xl sc-skeleton-line"></div>
              <div class="h-10 rounded-xl sc-skeleton-line"></div>
              <div class="h-10 rounded-xl sc-skeleton-line"></div>
            </div>
            <div class="rounded-2xl p-3 sc-skeleton-panel">
              <div class="h-10 w-36 rounded-xl sc-skeleton-line"></div>
            </div>
          </div>
        </article>
      {/each}
    {:else if filteredGyms.length === 0}
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <p class="text-slate-500">Nessuna palestra trovata con i filtri selezionati.</p>
      </div>
    {:else}
      {#each filteredGyms as gym, i}
        {@const image = resolveImageSource(gym)}
        {@const disciplinePreview = disciplinePreviewForGym(gym, 4)}
        <article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sc-card sc-gym-card" style={`animation-delay:${i * 20}ms`}>
          <div class="relative h-44 overflow-hidden">
            <img
              src={image.src}
              alt={`Immagine ${gym.name}`}
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              on:error={(event) => handleImageError(event, image)}
            />
            <span class="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-bold text-white sc-badge sc-badge--accent">{disciplinePreview.primary}</span>
            {#if gym.distance_km !== null && gym.distance_km !== undefined}
              <span class="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white sc-badge">{gym.distance_km} km</span>
            {/if}
            <span class="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold text-white sc-badge {gym.is_open_now === true ? 'sc-badge--open' : gym.is_open_now === false ? 'sc-badge--closed' : 'bg-slate-500'}">
              {gym.is_open_now === true ? 'Aperta ora' : gym.is_open_now === false ? 'Chiusa ora' : 'Stato orario n/d'}
            </span>
          </div>

          <div class="space-y-3 p-3 sm:p-4">
            <div class="space-y-1 rounded-2xl sc-gym-card-head p-3">
              <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Dettagli palestra</p>
              <h3 class="text-lg font-bold leading-tight text-slate-900">
                <a href={gymHref(gym)} class="transition hover:text-emerald-800">
                  {displayName(gym.name)}
                </a>
              </h3>
              <div class="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                {#if gym.distance_km !== null && gym.distance_km !== undefined}
                  <span class="rounded-full bg-slate-100 px-2.5 py-1">{gym.distance_km} km</span>
                {/if}
                {#if displayName(gym.city)}
                  <span class="rounded-full bg-slate-100 px-2.5 py-1">{displayName(gym.city)}</span>
                {/if}
              </div>
              <div class="mt-3 flex flex-wrap gap-2 sc-discipline-list">
                <span class="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] sc-discipline-chip sc-discipline-chip--primary">
                  {disciplinePreview.primary}
                </span>
                {#if disciplinePreview.secondary.length || disciplinePreview.remaining}
                  {#each disciplinePreview.secondary as label}
                    <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip">{label}</span>
                  {/each}
                  {#if disciplinePreview.remaining}
                    <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip sc-discipline-chip--muted">+{disciplinePreview.remaining}</span>
                  {/if}
                {/if}
              </div>
            </div>

            <div class="grid gap-2">
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Indirizzo:</strong> {formatAddressForDisplay(gym)}</p>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Orari:</strong> {displayName(gym.hours_info)}</p>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Telefono:</strong> {displayName(gym.phone) || '-'}</p>
            </div>

            <div class="rounded-2xl sc-gym-card-cta p-3">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Prossimo passo</p>
                  <p class="mt-1 text-sm text-slate-600">Apri la scheda per vedere contatti, mappa e dettagli utili.</p>
                </div>
                <a
                  href={gymHref(gym)}
                  class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 sc-button"
                >
                  Scheda completa
                </a>
              </div>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </section>
  </main>
</div>

