<script>
  import { gymHref } from '$lib/gym-detail';
  import { publicCityForGym } from '$lib/location-quality';
  import { canonicalizeDiscipline } from '$lib/discipline-taxonomy';
  import { slugifySeoName } from '$lib/seo-directory';
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';
  import { buildLocationSeoMeta } from '$lib/seo-meta';
  import { formatCount } from '$lib/text-format';
  import GymCard from '$lib/components/GymCard.svelte';

  export let data;

  const { location, topDisciplines } = data;
  let gyms = data.gyms || [];
  let totalGyms = data.totalGyms || gyms.length;
  let hasMoreFromServer = Boolean(data.hasMoreGyms);
  let loadingMoreGyms = false;
  let loadMoreError = '';
  const pageUrl = absoluteUrl(`/zone/${location.slug}`);
  const seoMeta = buildLocationSeoMeta(location.name, topDisciplines, totalGyms, hasMoreFromServer);
  const title = seoMeta.title;
  const description = seoMeta.description;
  $: isIndexableLanding = totalGyms >= 2;
  const disciplineSummary = topDisciplines.join(', ');
  $: cityStats = [...gyms
    .reduce((map, gym) => {
      const city = publicCityForGym(gym) || location.name;
      map.set(city, (map.get(city) || 0) + 1);
      return map;
    }, new Map())
    .entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
    .slice(0, 6);
  const disciplineLinks = topDisciplines
    .map((name) => {
      const canonical = canonicalizeDiscipline(name);
      return canonical?.slug ? { name, href: `/discipline/${canonical.slug}/${location.slug}` } : null;
    })
    .filter(Boolean);
  $: cityLinks = cityStats.map(([city, count]) => ({
    city,
    count,
    href: `/zone/${slugifySeoName(city)}`
  }));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const coordinateNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const isMappableGym = (gym) => coordinateNumber(gym?.latitude) !== null && coordinateNumber(gym?.longitude) !== null;
  const boundsForGyms = (items) => {
    const points = items
      .map((gym) => ({ lat: coordinateNumber(gym?.latitude), lng: coordinateNumber(gym?.longitude) }))
      .filter((point) => point.lat !== null && point.lng !== null);
    if (!points.length) return null;

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    let south = Math.min(...lats);
    let north = Math.max(...lats);
    let west = Math.min(...lngs);
    let east = Math.max(...lngs);
    const latSpread = Math.max(north - south, 0.012);
    const lngSpread = Math.max(east - west, 0.014);

    south -= Math.max(latSpread * 0.22, 0.006);
    north += Math.max(latSpread * 0.22, 0.006);
    west -= Math.max(lngSpread * 0.22, 0.007);
    east += Math.max(lngSpread * 0.22, 0.007);

    return { south, north, west, east };
  };
  $: mappableGyms = gyms.filter(isMappableGym);
  $: zoneMapBounds = boundsForGyms(mappableGyms);
  $: zoneMapHref = zoneMapBounds
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${zoneMapBounds.west}%2C${zoneMapBounds.south}%2C${zoneMapBounds.east}%2C${zoneMapBounds.north}&layer=mapnik`
    : '';
  $: zoneMapOpenHref = zoneMapBounds
    ? `https://www.openstreetmap.org/?bbox=${zoneMapBounds.west}%2C${zoneMapBounds.south}%2C${zoneMapBounds.east}%2C${zoneMapBounds.north}`
    : '';
  function markerStyle(gym) {
    if (!zoneMapBounds) return '';
    const lat = coordinateNumber(gym?.latitude);
    const lng = coordinateNumber(gym?.longitude);
    const x = ((lng - zoneMapBounds.west) / (zoneMapBounds.east - zoneMapBounds.west)) * 100;
    const y = (1 - (lat - zoneMapBounds.south) / (zoneMapBounds.north - zoneMapBounds.south)) * 100;
    return `left:${clamp(x, 4, 96)}%;top:${clamp(y, 6, 94)}%;`;
  }
  const INITIAL_VISIBLE_GYMS = 24;
  let visibleLimit = INITIAL_VISIBLE_GYMS;
  $: visibleGyms = gyms.slice(0, visibleLimit);
  $: hasMoreGyms = visibleGyms.length < gyms.length || hasMoreFromServer;
  async function loadMoreGyms() {
    if (loadingMoreGyms) return;
    if (visibleGyms.length < gyms.length) {
      visibleLimit += 24;
      return;
    }

    loadingMoreGyms = true;
    loadMoreError = '';
    try {
      const params = new URLSearchParams({
        q: location.name,
        limit: String(INITIAL_VISIBLE_GYMS),
        offset: String(gyms.length)
      });
      const response = await fetch(`/api/gyms?${params.toString()}`);
      if (!response.ok) throw new Error('Caricamento non riuscito');
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
      if (!Array.isArray(items)) throw new Error('Risposta non valida');

      const byId = new Map(gyms.map((gym) => [gym.id, gym]));
      for (const gym of items) {
        if (gym?.id && !byId.has(gym.id)) byId.set(gym.id, gym);
      }
      gyms = [...byId.values()];
      totalGyms = Math.max(totalGyms, gyms.length);
      hasMoreFromServer = Boolean(payload?.hasMore);
      visibleLimit += 24;
    } catch {
      loadMoreError = 'Non riesco a caricare altre schede ora. Riprova tra poco.';
    } finally {
      loadingMoreGyms = false;
    }
  }
  const faqItems = [
    {
      question: `Che cosa trovo nella pagina ${location.title}?`,
      answer: `La pagina raccoglie ${formatCount(totalGyms, 'scheda pubblica', 'schede pubbliche')} collegate a ${location.name}. Serve a vedere in un colpo solo quali strutture del catalogo ricadono davvero in quest'area.`
    },
    {
      question: `Quali discipline sono piu presenti a ${location.name}?`,
      answer: disciplineSummary
        ? `In questa zona le discipline con piu schede sono ${disciplineSummary}.`
        : `In questa zona abbiamo ancora poche schede pubbliche.`
    },
    {
      question: `Le schede di ${location.name} mostrano contatti e orari?`,
      answer: `Si. Quando disponibili, le schede mostrano indirizzo, orari e riferimenti per contattare la struttura o controllare il sito ufficiale.`
    }
  ];
  const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: title,
          description,
          url: pageUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: SITE_NAME,
            url: absoluteUrl('/')
          },
          about: topDisciplines,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: gyms.length,
            itemListElement: gyms.slice(0, 12).map((gym, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: absoluteUrl(gymHref(gym)),
              name: gym.name
            }))
        }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: SITE_NAME,
              item: absoluteUrl('/')
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Zone',
              item: absoluteUrl('/zone')
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: location.title,
              item: pageUrl
            }
          ]
        },
        {
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer
            }
          }))
        }
      ]
    };
  const structuredDataScript = jsonLdScript(structuredData);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content={isIndexableLanding ? 'index,follow' : 'noindex,follow'} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  {@html structuredDataScript}
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <main class="mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 sc-zone-page">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7 sc-zone-hero">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Landing locale</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{location.title}</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{location.description}</p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{formatCount(gyms.length, 'scheda disponibile', 'schede disponibili')}</span>
        {#each disciplineLinks as discipline}
          <a href={discipline.href} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">{discipline.name}</a>
        {/each}
        {#each cityStats.slice(0, 2) as [city, count]}
          <a href={`/zone/${slugifySeoName(city)}`} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">{city}: {count}</a>
        {/each}
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-6 sc-zone-map-section" aria-labelledby="zone-map-title">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Mappa della zona</p>
          <h2 id="zone-map-title" class="mt-1 text-2xl font-bold leading-tight text-slate-900">Palestre presenti a {location.name}</h2>
        </div>
        <div class="flex flex-wrap gap-2 text-xs font-bold">
          <span class="rounded-full sc-filter-chip px-3 py-1">{formatCount(gyms.length, 'scheda', 'schede')}</span>
          <span class="rounded-full sc-filter-chip px-3 py-1">{formatCount(mappableGyms.length, 'segnalino', 'segnalini')} in mappa</span>
        </div>
      </div>

      {#if zoneMapHref}
        <div class="relative mt-4 h-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white sc-zone-map sm:h-[24rem]">
          <iframe
            title={`Mappa palestre a ${location.name}`}
            src={zoneMapHref}
            class="h-full w-full"
            loading="lazy"
            width="1120"
            height="384"
          ></iframe>
          <div class="pointer-events-none absolute inset-0">
            {#each mappableGyms as gym, i}
              <a
                href={gymHref(gym)}
                class="pointer-events-auto absolute grid h-8 w-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-slate-900 text-xs font-black text-white shadow-lg ring-2 ring-white transition hover:scale-110 focus-visible:scale-110 sc-zone-map-marker"
                style={markerStyle(gym)}
                aria-label={`Apri la scheda di ${gym.name}`}
                title={gym.name}
              >
                {i + 1}
              </a>
            {/each}
          </div>
        </div>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
          <a href={zoneMapOpenHref} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button sc-button--secondary">
            Apri mappa grande
          </a>
          <a href="#palestre-zona" class="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition sc-button sc-button--primary">
            Vai alle schede
          </a>
        </div>
      {:else}
        <div class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm font-semibold text-slate-600">
          Le coordinate delle palestre in questa zona sono ancora in verifica. Le schede disponibili sono subito sotto.
        </div>
      {/if}
    </section>

    <section id="palestre-zona" class="mt-5 scroll-mt-24 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sc-zone-results" aria-label={`Palestre a ${location.name}`}>
      {#if gyms.length === 0}
        <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
          <p class="text-slate-600">Per questa zona non ci sono ancora abbastanza schede pubbliche curate.</p>
        </div>
      {:else}
        {#each visibleGyms as gym, i}
          <GymCard {gym} index={i} kicker={location.name} let:disciplinePreview>
            <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Disciplina:</strong> {disciplinePreview.primary}</p>
            <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Zona:</strong> {gym.city || location.name}</p>
          </GymCard>
        {/each}
        {#if hasMoreGyms}
          <div class="col-span-full flex justify-center rounded-2xl border border-slate-200 bg-white/80 p-4">
            <button
              type="button"
              class="inline-flex min-h-[2.9rem] items-center justify-center rounded-xl px-5 text-sm font-bold transition sc-button sc-button--primary"
              aria-busy={loadingMoreGyms}
              on:click={loadMoreGyms}
            >
              {loadingMoreGyms ? 'Caricamento...' : `Carica altre schede (${Math.max(totalGyms - visibleGyms.length, 0)})`}
            </button>
            {#if loadingMoreGyms}
              <p class="sr-only" role="status">Caricamento altre schede in corso.</p>
            {/if}
            {#if loadMoreError}
              <p class="text-sm font-semibold text-red-700" role="alert">{loadMoreError}</p>
            {/if}
          </div>
        {/if}
      {/if}
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Panoramica della zona</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Allenarsi a {location.name}: come leggere questa raccolta</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Mappa e card mostrano le strutture disponibili a {location.name}. Apri una scheda per controllare dati e contatti.
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          In questa zona le discipline con piu schede sono <strong>{disciplineSummary || 'fitness e arti marziali'}</strong>.
          Nella scheda puoi controllare contatti, orari e posizione.
        </p>
      </div>
    </section>

    {#if cityStats.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Copertura locale</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Comuni e aree piu presenti nella raccolta</h2>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each cityLinks as item}
            <a href={item.href} class="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md sc-detail-card">
              <span class="sr-only">Apri le palestre a {item.city}</span>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{item.city}</p>
              <p class="mt-2 text-2xl font-bold text-slate-900">{item.count}</p>
              <p class="mt-1 text-sm font-semibold text-slate-600">{formatCount(item.count, 'scheda mappata', 'schede mappate')}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if disciplineLinks.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Percorsi correlati</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Discipline da confrontare in questa zona</h2>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          {#each disciplineLinks as discipline}
            <a href={discipline.href} class="inline-flex min-h-[2.75rem] items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-50">
              {discipline.name}
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Come leggerla</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come usare questa pagina</h2>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Selezione</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">La pagina raggruppa le schede pubbliche collegate a questa zona.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Confronto rapido</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Confronta indirizzo, discipline e orari prima di aprire la scheda.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Ricerca locale</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Se non conosci la zona, parti dalle schede gia presenti nel catalogo.</p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Domande frequenti</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">FAQ sulla zona {location.name}</h2>
      </div>

      <div class="mt-5 grid gap-3">
        {#each faqItems as item}
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <h3 class="text-base font-bold text-slate-900">{item.question}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600 sm:text-base">{item.answer}</p>
          </div>
        {/each}
      </div>
    </section>
  </main>
</div>

<style>
  .sc-zone-map {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.38),
      0 14px 28px rgba(31, 54, 45, 0.08);
  }

  .sc-zone-map iframe {
    border: 0;
    pointer-events: none;
  }

  .sc-zone-map-marker {
    z-index: 2;
  }

  .sc-zone-map-marker::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    width: 0.55rem;
    height: 0.55rem;
    background: #173129;
    transform: translate(-50%, -55%) rotate(45deg);
    z-index: -1;
  }

  @media (max-width: 640px) {
    .sc-zone-map-marker {
      height: 2.25rem;
      width: 2.25rem;
    }
  }
</style>
