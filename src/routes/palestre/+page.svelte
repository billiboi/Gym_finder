<script>
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';

  export let data;

  const { cities = [], totalGyms = 0, totalCities = 0 } = data;
  const pageUrl = absoluteUrl('/palestre');
  const title = `Tutte le palestre del catalogo | ${SITE_NAME}`;
  const description = `Elenco completo delle ${totalGyms} palestre del catalogo, in ordine per città: apri la scheda con contatti, orari e indicazioni.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: totalGyms,
      itemListElement: cities.flatMap((city) => city.gyms).map((gym, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: gym.name,
        url: absoluteUrl(`/palestre/${gym.slug}`)
      }))
    }
  };
  const structuredDataScript = jsonLdScript(structuredData);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content="index,follow" />
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
  <main class="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-hero sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] sc-hero-kicker">Catalogo</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Tutte le palestre</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 sm:text-base sc-hero-lede">
        L'elenco completo delle schede pubblicate, raggruppate per città. Cerchi qualcosa di
        specifico? Filtra per disciplina, zona o distanza dalla ricerca in home.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{totalGyms} schede</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{totalCities} città</span>
      </div>
      <div class="mt-5 flex flex-wrap gap-2">
        <a href="/#home-search" class="sc-button sc-button--hero-primary px-4 py-2.5 text-sm">Cerca una palestra</a>
        <a href="/zone" class="sc-hero-secondary-cta sc-button px-4 py-2.5 text-sm">Sfoglia le zone</a>
        <a href="/discipline" class="sc-hero-secondary-cta sc-button px-4 py-2.5 text-sm">Sfoglia le discipline</a>
      </div>
    </section>

    {#if totalCities > 1}
      <nav class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5" aria-label="Vai alla città">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Vai a</p>
        <ul class="mt-2 flex flex-wrap gap-2">
          {#each cities as city (city.slug)}
            <li>
              <a href={`#citta-${city.slug}`} class="sc-ui-pill inline-flex min-h-[2.25rem] items-center px-3 py-1.5 text-xs font-semibold">
                {city.name} <span class="ml-1.5 opacity-70">{city.gyms.length}</span>
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    {/if}

    {#each cities as city (city.slug)}
      <section id={`citta-${city.slug}`} class="mt-5 scroll-mt-24 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <h2 class="text-2xl font-bold text-slate-900">{city.name}</h2>
          {#if city.zoneSlug}
            <a href={`/zone/${city.zoneSlug}`} class="text-sm font-semibold underline underline-offset-4">
              Pagina zona {city.name}
            </a>
          {/if}
        </div>
        <ul class="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {#each city.gyms as gym (gym.slug)}
            <li>
              <a
                href={`/palestre/${gym.slug}`}
                class="flex min-h-[2.75rem] items-center rounded-xl px-2 py-2 text-sm leading-6 text-slate-700 transition hover:-translate-y-0.5 hover:bg-white"
              >
                {gym.name}
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    {#if !totalGyms}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-sm leading-7 text-slate-600">
          Il catalogo non è raggiungibile in questo momento. Riprova tra qualche minuto oppure
          <a href="/contatti" class="font-semibold underline underline-offset-4">segnalacelo</a>.
        </p>
      </section>
    {/if}
  </main>
</div>
