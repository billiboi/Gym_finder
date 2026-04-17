<script>
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';

  export let data;

  const { featuredLocations = [], extraLocations = [], totalLocations = 0 } = data;
  const pageUrl = absoluteUrl('/zone');
  const title = `Zone | ${SITE_NAME}`;
  const description = `Esplora le zone presenti nel catalogo pubblico e apri le raccolte locali disponibili.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [...featuredLocations, ...extraLocations].map((location, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: location.name,
        url: absoluteUrl(`/zone/${location.slug}`)
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
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Panoramica zone</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Sfoglia tutte le zone</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Qui trovi l'accesso alle raccolte locali presenti nel catalogo pubblico, cos&igrave; puoi partire dalla zona che ti interessa invece di finire su una pagina scelta in automatico.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{totalLocations} zone disponibili</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{featuredLocations.length} pagine curate</span>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Pagine prioritarie</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Landing zona gi&agrave; curate</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Qui trovi le zone che hanno gi&agrave; una pagina pi&ugrave; strutturata. Sono i punti migliori da cui partire se vuoi confrontare pi&ugrave; schede locali con una selezione ordinata.
        </p>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each featuredLocations as location}
          <a href={`/zone/${location.slug}`} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Landing curata</p>
            <h3 class="mt-2 text-lg font-bold text-slate-900">{location.name}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600">{location.description}</p>
            <p class="mt-3 text-sm font-semibold text-emerald-800">{location.count} schede pubbliche</p>
          </a>
        {/each}
      </div>
    </section>

    {#if extraLocations.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Catalogo completo</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Altre zone presenti nel catalogo</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Queste localit&agrave; compaiono gi&agrave; nelle schede pubbliche. L'hub ti permette di raggiungerle senza passare da scorciatoie arbitrarie nell'header.
          </p>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {#each extraLocations as location}
            <a href={`/zone/${location.slug}`} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Zona</p>
              <h3 class="mt-2 text-lg font-bold text-slate-900">{location.name}</h3>
              <p class="mt-3 text-sm font-semibold text-slate-700">{location.count} schede collegate</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>
