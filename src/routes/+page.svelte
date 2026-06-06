<script>
  import { onDestroy, onMount } from 'svelte';
  import { dedupeDisciplines, normalizeDisciplineLabel, publicDisciplineFilterOptions } from '$lib/disciplines';
  import { disciplinePreviewForGym, gymHref, imageForGym, isPremiumGym, isVerifiedGym } from '$lib/gym-detail';
  import { isGymOpenNow } from '$lib/hours';
  import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';
  import { buildHomepageSeoMeta } from '$lib/seo-meta';
  import { repairMojibake } from '$lib/text-repair';
  import { gymTrackingPayload, trackEvent } from '$lib/tracking';
  import TrustBadges from '$lib/components/TrustBadges.svelte';
  export let data;

  const CLIENT_CACHE_KEY = 'palestreinzona:catalog:v1';
  const CLIENT_CACHE_TTL = 5 * 60 * 1000;
  const INITIAL_VISIBLE_LIMIT = 24;
  const LOAD_MORE_STEP = 24;
  const API_GYM_LIMIT = 24;

  const popularSearches = [
    { label: 'Palestre a Varese', href: '/zone/varese' },
    { label: 'Palestre a Lugano', href: '/zone/lugano' },
    { label: 'Boxe a Varese', href: '/?q=Boxe%20Varese#elenco-palestre' },
    { label: 'MMA a Lugano', href: '/?q=MMA%20Lugano#elenco-palestre' },
    { label: 'Palestre aperte ora', href: '/?open=now#elenco-palestre' }
  ];

  const trustBenefitCards = [
    { value: 'Zona', label: 'cerca per città, distanza e disciplina' },
    { value: 'Schede', label: 'contatti, orari, sito e dettagli utili' },
    { value: 'Scelta', label: 'confronto rapido senza aprire mille tab' }
  ];

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

  function phoneHref(value) {
    const phone = displayName(value);
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned ? `tel:${cleaned}` : '';
  }

  function websiteHref(value) {
    const url = displayName(value);
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function directionsHref(gym) {
    const target = displayName([gym?.address, gym?.city].filter(Boolean).join(', '));
    return target ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}` : '';
  }

  function hoursForCard(value) {
    const hours = displayName(value) || 'Orari da confermare';
    const unsafeCrawlerText =
      hours.length > 140 ||
      /\b(skip to|password|privacy|cookie|shopping_cart|area privata|registrati|campionat|contributo|societ[aà]|segreteria)\b/i.test(hours);

    if (unsafeCrawlerText) return ['Orari da confermare'];

    return hours
      .split('|')
      .map((part) => (part.trim() === 'Orari da verificare' || part.trim() === 'Orari n/d' ? 'Orari da confermare' : part.trim()))
      .filter((part) => part.length <= 28)
      .filter(Boolean);
  }

  function priceForCard(gym) {
    const commercialInfoVerified = Boolean(gym?.verified_commercial_info);
    const commercialInfoCheckedAt = Boolean(displayName(gym?.commercial_info_last_checked_at));
    const sourceUrl = websiteHref(gym?.source_url || gym?.official_source_url || gym?.price_source_url);
    const websiteUrl = websiteHref(gym?.website);
    const sourceMatchesWebsite =
      sourceUrl && websiteUrl
        ? (() => {
            try {
              const sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, '');
              const websiteHost = new URL(websiteUrl).hostname.replace(/^www\./, '');
              return sourceHost === websiteHost || sourceHost.endsWith(`.${websiteHost}`) || websiteHost.endsWith(`.${sourceHost}`);
            } catch {
              return false;
            }
          })()
        : false;

    const hasOfficialTrace = Boolean(sourceUrl && (sourceMatchesWebsite || !websiteUrl));
    if (!hasOfficialTrace) return null;

    const price = (
      displayName(gym?.price_info) ||
      displayName(gym?.price) ||
      displayName(gym?.monthly_price) ||
      displayName(gym?.monthlyPrice)
    );

    if (!price || price.length > 120) return null;
    if (/\b(skip to|privacy|cookie|shopping_cart|password|registrati|area privata|tel\.|telefono|fax|p\.i\.|c\.f\.|societ[aà]|segreteria)\b/i.test(price)) return null;
    if (/\b(secondo la pagina sede|nonstop gym|omyoga community)\b/i.test(price)) return null;

    const ownCity = displayName(gym?.city).toLowerCase();
    const knownCities = ['lugano', 'bellinzona', 'saronno', 'castellanza', 'tradate', 'locarno', 'muralto', 'gallarate', 'varese', 'arona', 'busto arsizio'];
    const citedOtherCity = knownCities.find((city) => city !== ownCity && price.toLowerCase().includes(city));
    if (citedOtherCity) return null;

    const hasSpecificAmount = /(\d|€|chf|eur|gratis|gratuit)/i.test(price);
    if (!hasSpecificAmount) return null;

    const firstPart = price.split(/[.;|]/).map((part) => part.trim()).find(Boolean) || price;
    const label = firstPart.length > 96 ? `${firstPart.slice(0, 93).trim()}...` : firstPart;
    const verified = Boolean(commercialInfoVerified && commercialInfoCheckedAt && sourceMatchesWebsite);
    return {
      label,
      sourceLabel: verified ? 'Prezzo verificato' : 'Da fonte ufficiale'
    };
  }

  function hasCardPrice(gym) {
    return Boolean(priceForCard(gym)?.label);
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

  let searchInput = '';
  let filterText = '';
  let filterDiscipline = '';
  let filterOpenState = 'all';
  let sortMode = 'recommended';

  let userLocation = null;
  let locating = false;
  let locationError = '';
  let locationRadius = 20;
  let nearbyOnly = true;
  let filtersExpanded = false;
  let searchDebounceTimer = null;
  let scheduledSearchValue = '';
  let visibleLimit = INITIAL_VISIBLE_LIMIT;
  let remoteHasMoreGyms = Boolean(data?.initialHasMoreGyms);
  let catalogHydrated = !remoteHasMoreGyms;
  let backgroundCatalogLoading = false;
  let nextGymOffset = Array.isArray(data?.initialGyms) ? data.initialGyms.length : 0;

  $: {
  filterText;
  filterDiscipline;
  filterOpenState;
  sortMode;
  userLocation;
  nearbyOnly;
  locationRadius;
  filteredGyms = filterClientGyms(gyms);
}
  $: visibleGyms = filteredGyms.slice(0, visibleLimit);
  $: hasMoreVisibleGyms = filteredGyms.length > visibleGyms.length || remoteHasMoreGyms;
  $: totalGyms = filteredGyms.length;
  $: nextGymsLabel = remoteHasMoreGyms && filteredGyms.length <= visibleGyms.length
    ? LOAD_MORE_STEP
    : Math.min(LOAD_MORE_STEP, Math.max(0, filteredGyms.length - visibleGyms.length));
  $: disciplineCount = disciplines.length;
  $: locationReady = Boolean(userLocation);
  $: isBootstrapping = loadingGyms || loadingDisciplines;
  $: quickSuggestionPool = buildQuickSuggestionPool(gyms, disciplines);
  $: quickSearchSuggestions = filterQuickSuggestions(quickSuggestionPool, searchInput);
  $: activeFilterCount = [
    searchInput.trim(),
    filterDiscipline.trim(),
    filterOpenState !== 'all',
    locationReady,
    sortMode !== 'recommended'
  ].filter(Boolean).length;
  $: hasActiveFilters = activeFilterCount > 0;
  $: if (!locationReady && sortMode === 'distance') sortMode = 'recommended';
  $: if (searchInput !== filterText) scheduleSearchApply(searchInput);
  $: catalogGymCount = data?.catalogTotalGyms || gyms.length || totalGyms || 0;
  $: catalogGymLabel = catalogGymCount ? `${catalogGymCount}` : '500+';
  $: catalogDisciplineCount = data?.catalogTotalDisciplines || disciplineCount || 0;
  $: catalogZoneCount = data?.catalogZonesAvailable || 0;
  $: catalogCuratedPageCount = data?.catalogCuratedPages || 0;
  $: shownGymsLabel = hasActiveFilters
    ? `Mostrate ${visibleGyms.length} schede filtrate`
    : `Mostrate ${visibleGyms.length} schede su ${catalogGymLabel}`;
  $: resultsCountLabel = hasActiveFilters ? `${filteredGyms.length} risultati nella pagina caricata` : shownGymsLabel;

  if (Array.isArray(data?.initialGyms)) {
    gyms = data.initialGyms;
  }

  if (Array.isArray(data?.initialDisciplines)) {
    disciplines = publicDisciplineFilterOptions(data.initialDisciplines);
  }

  $: homepageSeo = buildHomepageSeoMeta();
  $: homepageTitle = homepageSeo.title;
  $: homepageDescription = homepageSeo.description;
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
        '@type': 'Organization',
        name: SITE_NAME,
        url: absoluteUrl('/')
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
        .sort((a, b) => sortGyms(a, b));
    } else {
      out = out.sort((a, b) => sortGyms(a, b));
    }

    return out;
  }

  function sortGyms(a, b) {
    if (sortMode === 'name') return a.name.localeCompare(b.name, 'it');

    if (sortMode === 'open') {
      const openScore = (gym) => (gym.is_open_now === true ? 0 : gym.is_open_now === false ? 1 : 2);
      const scoreDiff = openScore(a) - openScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name, 'it');
    }

    if (userLocation || sortMode === 'distance') {
      if (a.distance_km === null && b.distance_km === null) return a.name.localeCompare(b.name, 'it');
      if (a.distance_km === null || a.distance_km === undefined) return 1;
      if (b.distance_km === null || b.distance_km === undefined) return -1;
      if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
      return a.name.localeCompare(b.name, 'it');
    }

    const priceDiff = Number(hasCardPrice(b)) - Number(hasCardPrice(a));
    if (priceDiff !== 0) return priceDiff;
    return a.name.localeCompare(b.name, 'it');
  }

  function buildQuickSuggestionPool(allGyms, allDisciplines) {
    const pool = new Map();

    for (const gym of allGyms) {
      const name = displayName(gym.name);
      if (name && !pool.has(name.toLowerCase())) {
        pool.set(name.toLowerCase(), { value: name, searchText: name.toLowerCase(), type: 'gym' });
      }
    }

    for (const discipline of dedupeDisciplines(allDisciplines)) {
      const value = displayName(discipline);
      if (value && !pool.has(value.toLowerCase())) {
        pool.set(value.toLowerCase(), { value, searchText: value.toLowerCase(), type: 'discipline' });
      }
    }

    for (const gym of allGyms) {
      const city = displayName(gym.city);
      if (city && !pool.has(city.toLowerCase())) {
        pool.set(city.toLowerCase(), { value: city, searchText: city.toLowerCase(), type: 'city' });
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
        const text = entry.searchText;
        const startsWith = text.startsWith(q);
        const wordBoundary = text.includes(` ${q}`);
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

  function applySearchNow() {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }

    scheduledSearchValue = searchInput;
    filterText = searchInput;
    trackEvent('search_submit', {
      query: searchInput.trim(),
      disciplina_principale: filterDiscipline.trim(),
      stato_apertura: filterOpenState,
      risultati_visibili: filteredGyms.length
    });
    if (searchInput.trim() || filterDiscipline.trim()) {
      catalogHydrated = false;
      remoteHasMoreGyms = true;
      visibleLimit = INITIAL_VISIBLE_LIMIT;
      void loadGyms({ reset: true });
    }
  }

  function focusSearchBox() {
    document.getElementById('hero-gym-search')?.focus();
  }

  function applyUrlSearchParams() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const open = params.get('open');

    if (query) {
      searchInput = query;
      scheduledSearchValue = query;
      filterText = query;
    }

    if (open === 'now') {
      filterOpenState = 'open';
      filtersExpanded = true;
    }
  }

  function applyPopularSearch(event, item) {
    if (!item.href.startsWith('/?')) return;

    event.preventDefault();
    const url = new URL(item.href, window.location.origin);
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    searchInput = '';
    scheduledSearchValue = '';
    filterText = '';
    filterOpenState = 'all';
    applyUrlSearchParams();
    applySearchNow();
    document.getElementById('elenco-palestre')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scheduleSearchApply(value) {
    if (value === scheduledSearchValue && searchDebounceTimer) return;

    scheduledSearchValue = value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    searchDebounceTimer = setTimeout(() => {
      filterText = value;
      searchDebounceTimer = null;
    }, 140);
  }

  async function loadGyms({ reset = false } = {}) {
    if (catalogHydrated || backgroundCatalogLoading) return;
    backgroundCatalogLoading = true;
    try {
      const params = new URLSearchParams({
        limit: String(API_GYM_LIMIT),
        offset: String(reset ? 0 : nextGymOffset)
      });
      if (filterText.trim()) params.set('q', filterText.trim());
      if (filterDiscipline.trim()) params.set('discipline', filterDiscipline.trim());
      const res = await fetch(`/api/gyms?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (items.length) {
          const byId = new Map(reset ? [] : gyms.map((gym) => [gym.id, gym]));
          for (const gym of items) {
            if (gym?.id) byId.set(gym.id, gym);
          }
          gyms = [...byId.values()];
          const responseOffset = Number(data?.offset);
          nextGymOffset = (Number.isFinite(responseOffset) ? responseOffset : reset ? 0 : nextGymOffset) + items.length;
          remoteHasMoreGyms = Boolean(data?.hasMore);
          catalogHydrated = !remoteHasMoreGyms;
          backgroundCatalogLoading = false;
          return;
        }
        if (reset) {
          gyms = [];
          nextGymOffset = 0;
        }
        remoteHasMoreGyms = false;
        catalogHydrated = true;
      }
    } catch {
      // Keep the server-rendered initial slice if hydration fails.
    }

    backgroundCatalogLoading = false;
  }
  async function loadDisciplines() {
    if (!loadingDisciplines && disciplines.length) return;
    loadingDisciplines = true;
    try {
      const res = await fetch('/api/disciplines');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          disciplines = publicDisciplineFilterOptions(data);
          loadingDisciplines = false;
          return;
        }
      }
    } catch {
      // Keep server-rendered disciplines if the endpoint is unavailable.
    }

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

  function resetFilters() {
    searchInput = '';
    scheduledSearchValue = '';
    filterText = '';
    filterDiscipline = '';
    filterOpenState = 'all';
    sortMode = 'recommended';
    userLocation = null;
    locationError = '';
    locationRadius = 20;
    nearbyOnly = true;
    visibleLimit = INITIAL_VISIBLE_LIMIT;
    nextGymOffset = 0;
    catalogHydrated = false;
    remoteHasMoreGyms = true;
    void loadGyms({ reset: true });
  }

  function readCachedCatalog() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CLIENT_CACHE_KEY) || 'null');
      if (!cached || Date.now() - cached.cachedAt > CLIENT_CACHE_TTL) return false;
      if (Array.isArray(cached.disciplines) && cached.disciplines.length) {
        disciplines = publicDisciplineFilterOptions(cached.disciplines);
        loadingDisciplines = false;
      }
      return false;
    } catch {
      return false;
    }
  }

  function writeCachedCatalog() {
    try {
      sessionStorage.setItem(
        CLIENT_CACHE_KEY,
        JSON.stringify({
          cachedAt: Date.now(),
          disciplines
        })
      );
    } catch {
      // Session storage is optional.
    }
  }

  function scheduleCatalogHydration() {
    const hydrate = async () => {
      await loadDisciplines();
      writeCachedCatalog();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(hydrate, { timeout: 1800 });
      return;
    }

    window.setTimeout(hydrate, 900);
  }

  async function showMoreGyms() {
    if (filteredGyms.length > visibleGyms.length) {
      visibleLimit += LOAD_MORE_STEP;
      return;
    }
    await loadGyms();
    visibleLimit += LOAD_MORE_STEP;
  }

  onMount(() => {
    applyUrlSearchParams();
    if (!readCachedCatalog()) scheduleCatalogHydration();
  });

  onDestroy(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
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
  <main id="top" class="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8" aria-busy={isBootstrapping}>
  <section class="reveal rounded-3xl border border-white/80 bg-white/70 p-4 shadow-xl backdrop-blur-sm sm:p-7 sc-panel sc-hero">
    <div class="mx-auto flex max-w-5xl flex-col gap-3 sc-hero-copy">
        <div class="max-w-3xl">
          <div class="inline-flex items-center rounded-full border border-emerald-900/10 bg-white/65 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-emerald-800">
            Palestre in Zona
          </div>
          <h1 class="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">Trova la palestra perfetta vicino a te</h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[1.05rem]">
            Confronta {catalogGymLabel} palestre, corsi e discipline nella tua zona. Scopri orari, contatti e dettagli aggiornati.
          </p>
          <p class="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-900">
            <span>{catalogGymLabel} palestre</span>
            <span aria-hidden="true">&bull;</span>
            <span>{catalogDisciplineCount} discipline pubbliche</span>
            <span aria-hidden="true">&bull;</span>
            <span>{catalogZoneCount} zone</span>
          </p>
          <div class="mt-5 flex flex-wrap gap-3 sc-hero-actions">
            <a
              href="#home-search"
              class="inline-flex min-h-[3rem] items-center justify-center rounded-2xl px-5 text-sm font-bold text-white transition sc-button"
              on:click={focusSearchBox}
            >
              Trova palestra
            </a>
            <a
              href="/per-le-palestre"
              class="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-50 sc-hero-secondary-cta"
            >
              Per proprietari
            </a>
            <a
              href="/verifica-schede"
              class="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-50 sc-hero-secondary-cta"
            >
              Metodo verifica
            </a>
          </div>
        </div>


    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
    <div class="max-w-4xl">
      <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Directory locale</p>
      <h2 class="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Trova palestre, corsi e discipline vicino a te</h2>
      <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
        Palestre in Zona ti aiuta a cercare palestre nella tua città, confrontare corsi e discipline disponibili e trovare rapidamente contatti, orari e informazioni utili. Puoi cercare per zona, distanza o tipo di allenamento e scegliere la palestra più adatta alle tue esigenze.
      </p>
    </div>
  </section>

  <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Fiducia</p>
        <h2 class="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Dati leggibili, fonti distinguibili, correzioni controllate</h2>
      </div>
      <a href="/verifica-schede" class="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50">Come funziona</a>
    </div>
    <div class="mt-5">
      <TrustBadges />
    </div>
  </section>

  <section class="mt-5 overflow-hidden rounded-3xl border border-white/70 bg-white/86 shadow-lg backdrop-blur-sm sc-panel">
    <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.36fr)]">
      <div class="p-4 sm:p-5 lg:p-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Scorciatoie utili</p>
            <h2 class="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">Parti da una ricerca già pronta</h2>
          </div>
          <p class="max-w-md text-sm font-semibold leading-6 text-slate-600">
            Link rapidi verso zone, discipline e schede filtrate.
          </p>
        </div>

        <div class="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {#each popularSearches as item}
            <a href={item.href} class="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-emerald-900/10 bg-white px-3 text-center text-sm font-bold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-800/25 hover:bg-emerald-50/70 hover:shadow-md" on:click={(event) => applyPopularSearch(event, item)}>
              {item.label}
            </a>
          {/each}
        </div>

        <div class="mt-5 grid gap-3 border-t border-emerald-900/10 pt-4 sm:grid-cols-2 xl:grid-cols-5">
          <div class="rounded-2xl bg-emerald-950 px-4 py-4 text-white">
            <p class="text-2xl font-black leading-none">{catalogGymLabel}</p>
            <p class="mt-2 text-sm font-bold leading-5 text-emerald-50">schede attive</p>
          </div>
          <div class="rounded-2xl bg-emerald-50/70 px-4 py-4">
            <p class="text-sm font-black uppercase tracking-[0.18em] text-emerald-800">{catalogCuratedPageCount}</p>
            <p class="mt-2 text-sm font-bold leading-5 text-slate-800">pagine curate</p>
          </div>
          {#each trustBenefitCards as benefit}
            <div class="rounded-2xl bg-emerald-50/70 px-4 py-4">
              <p class="text-sm font-black uppercase tracking-[0.18em] text-emerald-800">{benefit.value}</p>
              <p class="mt-2 text-sm font-bold leading-5 text-slate-800">{benefit.label}</p>
            </div>
          {/each}
        </div>
      </div>

      <aside class="flex flex-col justify-between bg-emerald-950 p-4 text-white sm:p-5 lg:p-6">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">Per le palestre</p>
          <h2 class="mt-2 text-2xl font-bold leading-tight">Gestisci gratuitamente la scheda della tua palestra</h2>
          <p class="mt-3 text-sm leading-6 text-emerald-50">
            Aggiorna contatti, orari e discipline senza obblighi pubblicitari. Le opzioni premium sono facoltative e vengono valutate solo su richiesta.
          </p>
        </div>
        <a href="/per-le-palestre" class="mt-5 inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50">
          Scopri le soluzioni
        </a>
      </aside>
    </div>
  </section>

  <section class="mt-5 scroll-mt-16" aria-label="Ricerca e filtri palestre">
    <div id="home-search" class="scroll-mt-16 rounded-[1.5rem] p-3 sm:p-4 sc-hero-search">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(190px,0.65fr)_auto] lg:items-end">
        <label class="grid gap-2">
          <span class="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500">Cerca</span>
          <input
            id="hero-gym-search"
            name="hero-gym-search"
            class="min-h-[3.35rem] rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
            placeholder="Cerca città, disciplina o palestra"
            bind:value={searchInput}
            list="quick-search-suggestions"
            on:keydown={(event) => {
              if (event.key === 'Enter') applySearchNow();
            }}
          />
        </label>
        <label class="grid gap-2">
          <span class="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500">Disciplina</span>
          <select
            id="hero-discipline-filter"
            name="hero-discipline-filter"
            class="min-h-[3.35rem] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
            bind:value={filterDiscipline}
            disabled={loadingDisciplines}
            on:change={applySearchNow}
          >
            <option value="">Tutte</option>
            {#each disciplines as discipline}
              <option value={discipline}>{discipline}</option>
            {/each}
          </select>
        </label>
        <a href="#elenco-palestre" class="inline-flex min-h-[3.35rem] items-center justify-center rounded-2xl px-5 text-center text-sm font-bold text-white transition sc-button" on:click={applySearchNow}>
          Trova palestra
        </a>
      </div>
      <p class="mt-2 text-sm font-semibold leading-6 text-slate-600">
        Esempi: Palestre a Varese, Boxe a Lugano, MMA vicino a me
      </p>
      <datalist id="quick-search-suggestions">
        {#each quickSearchSuggestions as suggestion}
          <option value={suggestion}></option>
        {/each}
      </datalist>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3">
          <button
            type="button"
            class="inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button-muted lg:hidden"
            aria-expanded={filtersExpanded}
            aria-controls="advanced-search-filters"
            aria-label={`${filtersExpanded ? 'Nascondi' : 'Mostra'} filtri avanzati`}
            on:click={() => (filtersExpanded = !filtersExpanded)}
          >
          Filtri{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </button>
        {#if locationReady}
          <button
            type="button"
            class="inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button-ghost lg:hidden"
            on:click={clearLocation}
          >
            Posizione attiva
          </button>
        {:else}
          <button
            type="button"
            class="inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button lg:hidden"
            on:click={detectLocation}
            disabled={locating}
          >
            {locating ? 'Rilevamento...' : 'Usa posizione'}
          </button>
        {/if}
        <p class="min-w-0 text-sm font-semibold text-slate-600" aria-live="polite">
          {resultsCountLabel} palestre trovate
        </p>
        {#if hasActiveFilters}
          <button type="button" class="inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button-ghost" on:click={resetFilters}>
            Reset
          </button>
        {/if}
      </div>

      {#if hasActiveFilters}
        <div class="mt-3 flex flex-wrap gap-2" aria-label="Filtri attivi">
          {#if searchInput.trim()}
            <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold sc-active-filter-chip" aria-label="Rimuovi filtro testo" on:click={() => { searchInput = ''; scheduledSearchValue = ''; filterText = ''; }}>
              Testo: {searchInput.trim()} x
            </button>
          {/if}
          {#if filterDiscipline.trim()}
            <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold sc-active-filter-chip" aria-label="Rimuovi filtro disciplina" on:click={() => { filterDiscipline = ''; applySearchNow(); }}>
              {filterDiscipline} x
            </button>
          {/if}
          {#if filterOpenState !== 'all'}
            <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold sc-active-filter-chip" aria-label="Rimuovi filtro apertura" on:click={() => (filterOpenState = 'all')}>
              {filterOpenState === 'open' ? 'Aperte adesso' : 'Chiuse adesso'} x
            </button>
          {/if}
          {#if locationReady}
            <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold sc-active-filter-chip" aria-label="Rimuovi filtro posizione" on:click={clearLocation}>
              {nearbyOnly ? `Entro ${locationRadius} km` : 'Posizione attiva'} x
            </button>
          {/if}
          {#if sortMode !== 'recommended'}
            <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold sc-active-filter-chip" aria-label="Rimuovi ordinamento" on:click={() => (sortMode = 'recommended')}>
              Ordine: {sortMode === 'name' ? 'Nome' : sortMode === 'open' ? 'Apertura' : 'Distanza'} x
            </button>
          {/if}
        </div>
      {/if}

      <div
        id="advanced-search-filters"
        class={`mt-3 gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-[minmax(155px,0.75fr)_minmax(140px,0.6fr)_minmax(135px,0.55fr)_max-content_auto] lg:items-end ${filtersExpanded ? 'grid' : 'hidden'}`}
      >
        <label class="grid gap-2">
          <span class="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Apertura</span>
          <select
            id="open-state-filter"
            name="open-state-filter"
            class="min-h-[3rem] rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
            bind:value={filterOpenState}
          >
            <option value="all">Aperte e chiuse</option>
            <option value="open">Aperte adesso</option>
            <option value="closed">Chiuse adesso</option>
          </select>
        </label>

        <label class="grid gap-2">
          <span class="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Ordina</span>
          <select
            id="sort-filter"
            name="sort-filter"
            class="min-h-[3rem] rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
            bind:value={sortMode}
          >
            <option value="recommended">Consigliato</option>
            <option value="name">Nome A-Z</option>
            <option value="open">Aperte prima</option>
            <option value="distance" disabled={!locationReady}>Distanza</option>
          </select>
        </label>

        <label class="grid gap-2">
          <span class="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Distanza</span>
          <select
            id="radius-filter"
            name="radius-filter"
            class="min-h-[3rem] rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-slate-900 transition focus:ring-2 sc-input sc-filter-field"
            bind:value={locationRadius}
            disabled={!locationReady}
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={30}>30 km</option>
            <option value={50}>50 km</option>
          </select>
        </label>

        <label class={`inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 sc-pill sc-filter-toggle sc-radius-toggle ${!locationReady ? 'opacity-60' : ''}`}>
          <input id="nearby-only" name="nearby-only" type="checkbox" bind:checked={nearbyOnly} disabled={!locationReady} />
          <span>Usa raggio</span>
        </label>

        {#if locationReady}
          <button type="button" class="hidden min-h-[3rem] items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-slate-100 sc-button-ghost lg:inline-flex" on:click={clearLocation}>
            Rimuovi posizione
          </button>
        {:else}
          <button type="button" class="hidden min-h-[3rem] items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sc-button-ghost lg:inline-flex" on:click={detectLocation} disabled={locating}>
            {locating ? 'Rilevamento...' : 'Usa posizione'}
          </button>
        {/if}
      </div>

      <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm font-semibold text-slate-600">
          {locationReady ? 'Risultati ordinati dalla tua posizione.' : 'Attiva la posizione per ordinare per distanza.'}
        </p>
        <div class="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <a
            href="/zone"
            class="sc-secondary-cta sc-secondary-cta--zone"
          >
            Sfoglia zone
          </a>
          <a
            href="/discipline"
            class="sc-secondary-cta sc-secondary-cta--discipline"
          >
            Sfoglia discipline
          </a>
        </div>
      </div>

      {#if locationError}
        <div class="mt-3 rounded-2xl border border-red-200 bg-red-50/85 px-4 py-3 text-sm font-semibold text-red-700">
          {locationError}
        </div>
      {/if}
    </div>
  </section>

  <section id="elenco-palestre" class="mt-5 scroll-mt-6" aria-label="Elenco palestre filtrate">
  <div class="mb-4 overflow-hidden rounded-3xl sc-results-shell">
    <div class="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-800">Elenco palestre</p>
          <span class="sc-results-count" aria-live="polite">{filteredGyms.length}</span>
        </div>
        <h2 class="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
          Confronta le strutture disponibili
        </h2>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 lg:min-w-[22rem]">
        <div class="sc-results-status">
          <span>Filtri</span>
          <strong>{hasActiveFilters ? `${activeFilterCount} ${activeFilterCount === 1 ? 'attivo' : 'attivi'}` : 'Nessuno'}</strong>
        </div>
        <div class="sc-results-status">
          <span>Ordine</span>
          <strong>{sortMode === 'distance' ? 'Distanza' : sortMode === 'name' ? 'Nome' : sortMode === 'open' ? 'Apertura' : 'Consigliato'}</strong>
        </div>
      </div>
    </div>

    {#if hasActiveFilters || locationReady}
      <div class="flex flex-col gap-3 border-t border-emerald-900/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p class="text-sm font-semibold leading-6 text-slate-600">
          {locationReady ? 'Distanza calcolata dalla tua posizione.' : 'Selezione aggiornata in base alla ricerca.'}
        </p>
        {#if hasActiveFilters}
          <button type="button" class="inline-flex min-h-[2.55rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button-ghost sm:w-auto" on:click={resetFilters}>
            Azzera filtri
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite" aria-busy={isBootstrapping}>
    {#if isBootstrapping && filteredGyms.length === 0}
      <p class="sr-only" role="status">Caricamento risultati in corso.</p>
      {#each Array(6) as _, i}
        <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sc-card sc-skeleton-card" style={`animation-delay:${i * 40}ms`} aria-hidden="true">
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
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center sm:p-8" role="status">
        <h3 class="text-lg font-bold text-slate-900">Nessuna palestra trovata</h3>
        <p class="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-600">
          Allarga la distanza, rimuovi un filtro o prova una città vicina.
        </p>
        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" class="inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button" on:click={resetFilters}>
            Mostra tutte
          </button>
          <a href="#top" class="inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button-ghost">
            Modifica ricerca
          </a>
        </div>
      </div>
    {:else}
      {#each visibleGyms as gym, i}
        {@const image = resolveImageSource(gym)}
        {@const disciplinePreview = disciplinePreviewForGym(gym, 3)}
        {@const phone = displayName(gym.phone)}
        {@const phoneLink = phoneHref(gym.phone)}
        {@const websiteLink = websiteHref(gym.website)}
        {@const directionsLink = directionsHref(gym)}
        {@const hasWebsite = Boolean(websiteLink)}
        {@const verified = isVerifiedGym(gym)}
        {@const premium = isPremiumGym(gym)}
        {@const openLabel = gym.is_open_now === true ? 'Aperta ora' : gym.is_open_now === false ? 'Chiusa ora' : ''}
        {@const openClass = gym.is_open_now === true ? 'sc-status-pill--open' : 'sc-status-pill--closed'}
        {@const hours = hoursForCard(gym.hours_info)}
        {@const priceInfo = priceForCard(gym)}
        <article
          id={`gym-${gym.id}`}
          class="group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sc-card sc-gym-card"
          style={`animation-delay:${i * 20}ms`}
        >
          <div class="relative h-40 overflow-hidden">
            <img
              src={image.src}
              alt={`Immagine ${gym.name}`}
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              width="360"
              height="160"
              sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw"
              on:error={(event) => handleImageError(event, image)}
            />
          </div>

          <div class="flex flex-1 flex-col gap-3 p-4">
            <div class="flex-1 space-y-3">
              <div class="space-y-2">
                <h3 class="line-clamp-2 text-lg font-bold leading-tight text-slate-900">
                  <a href={gymHref(gym)} class="transition hover:text-emerald-800">
                    {displayName(gym.name)}
                  </a>
                </h3>
                <div class="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  {#if openLabel}
                    <span class={`rounded-full px-2.5 py-1 font-bold ${openClass}`}>{openLabel}</span>
                  {/if}
                  {#if gym.distance_km !== null && gym.distance_km !== undefined}
                    <span class="rounded-full bg-slate-100 px-2.5 py-1">{gym.distance_km} km</span>
                  {/if}
                  {#if displayName(gym.city)}
                    <span class="rounded-full bg-slate-100 px-2.5 py-1">{displayName(gym.city)}</span>
                  {/if}
                  {#if verified}
                    <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">Verificata</span>
                  {/if}
                  {#if premium}
                    <span class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">Premium</span>
                  {/if}
                </div>
                <div class="flex flex-wrap gap-2 sc-discipline-list">
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] sc-discipline-chip sc-discipline-chip--primary">
                    {disciplinePreview.primary}
                  </span>
                  {#if disciplinePreview.secondary.length || disciplinePreview.remaining}
                    {#each disciplinePreview.secondary as label}
                      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip">{label}</span>
                    {/each}
                    {#if disciplinePreview.remaining}
                      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip sc-discipline-chip--muted">+{disciplinePreview.remaining} altre</span>
                    {/if}
                  {/if}
                </div>
              </div>

              <div class="grid gap-2 text-sm leading-6 text-slate-700 sc-gym-card-facts">
                <p>
                  <span>Indirizzo</span>
                  <strong>{formatAddressForDisplay(gym)}</strong>
                </p>
                <p class="sc-gym-card-hours">
                  <span>Orari</span>
                  <strong>
                    {#each hours as part}
                      <em>{part}</em>
                    {/each}
                  </strong>
                </p>
                {#if priceInfo?.label}
                  <p class="sc-gym-card-price">
                    <span>{priceInfo.sourceLabel}</span>
                    <strong>{priceInfo.label}</strong>
                  </p>
                {/if}
              </div>

              <div class="flex flex-wrap gap-2 text-xs font-bold sc-card-signal-list">
                {#if phoneLink}
                  <span class="rounded-full px-2.5 py-1 sc-card-signal--ok">Telefono disponibile</span>
                {:else}
                  <span class="rounded-full px-2.5 py-1 sc-card-signal--muted">Telefono da verificare</span>
                {/if}
                {#if hasWebsite}
                  <span class="rounded-full px-2.5 py-1 sc-card-signal--ok">Sito disponibile</span>
                {:else}
                  <span class="rounded-full px-2.5 py-1 sc-card-signal--muted">Sito non ancora disponibile</span>
                {/if}
              </div>
            </div>

            <div class="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
              {#if phoneLink}
                <a href={phoneLink} class="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50" on:click={() => trackEvent('click_telefono', gymTrackingPayload(gym))}>Chiama</a>
              {/if}
              {#if websiteLink}
                <a href={websiteLink} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50" on:click={() => trackEvent('click_sito', gymTrackingPayload(gym))}>Apri sito</a>
              {/if}
              {#if directionsLink}
                <a href={directionsLink} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50" on:click={() => trackEvent('click_indicazioni', gymTrackingPayload(gym))}>Indicazioni</a>
              {/if}
                <a
                  href={gymHref(gym)}
                  class="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800 sc-button"
                >
                  Scheda completa
                </a>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </div>

  {#if hasMoreVisibleGyms}
    <div class="mt-5 flex justify-center">
      <button
        type="button"
        class="inline-flex min-h-[2.9rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
        on:click={showMoreGyms}
      >
        {backgroundCatalogLoading ? 'Caricamento...' : `Mostra altre ${nextGymsLabel} palestre`}
      </button>
    </div>
  {/if}
</section>
  </main>
</div>

