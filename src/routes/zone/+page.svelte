<script>
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';
  import { formatCount } from '$lib/text-format';

  export let data;

  const { featuredLocations = [], extraLocations = [], totalLocations = 0 } = data;
  const pageUrl = absoluteUrl('/zone');
  const title = `Zone e città con palestre | ${SITE_NAME}`;
  const description = `Esplora città e zone del catalogo per trovare palestre, fitness e arti marziali vicine con pagine locali dedicate.`;
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

  function shortDescription(value, maxLength = 120) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length <= maxLength) return text;
    const slice = text.slice(0, maxLength - 1);
    return `${slice.slice(0, slice.lastIndexOf(' ') > 60 ? slice.lastIndexOf(' ') : slice.length).trim()}…`;
  }
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Zone e città</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Sfoglia tutte le zone</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 sm:text-base sc-hero-lede">
        Scegli una città o una zona e apri le schede collegate nel catalogo.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{totalLocations} zone disponibili</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{featuredLocations.length} pagine dedicate</span>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Pagine prioritarie</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Zone con pagina dedicata</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Queste zone hanno una pagina dedicata con schede collegate.
        </p>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each featuredLocations as location}
          <a href={`/zone/${location.slug}`} class="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pagina dedicata</p>
              <span class="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">{location.count}</span>
            </div>
            <h3 class="mt-2 text-lg font-bold text-slate-900">{location.name}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">{shortDescription(location.description)}</p>
            <div class="mt-auto flex items-center justify-between gap-3 pt-4">
              <span class="text-sm font-semibold text-emerald-800">{formatCount(location.count, 'scheda pubblica', 'schede pubbliche')}</span>
              <span class="inline-flex min-h-[2.35rem] items-center px-3 text-sm font-bold sc-button">Apri</span>
            </div>
          </a>
        {/each}
      </div>
    </section>

    {#if extraLocations.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Catalogo completo</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Altre zone presenti nel catalogo</h2>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {#each extraLocations as location}
            <a href={`/zone/${location.slug}`} class="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div class="flex items-start justify-between gap-3">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Zona</p>
                <span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{location.count}</span>
              </div>
              <h3 class="mt-2 text-lg font-bold text-slate-900">{location.name}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{shortDescription(location.description || `Schede pubbliche collegate a ${location.name}.`)}</p>
              <div class="mt-auto flex items-center justify-between gap-3 pt-4">
                <span class="text-sm font-semibold text-slate-700">{formatCount(location.count, 'scheda collegata', 'schede collegate')}</span>
                <span class="inline-flex min-h-[2.35rem] items-center px-3 text-sm font-bold sc-button sc-button--secondary">Apri</span>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>
