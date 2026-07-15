<script>
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';
  import { formatCount } from '$lib/text-format';

  export let data;

  const { featuredDisciplines = [], extraDisciplines = [], totalDisciplines = 0 } = data;
  const pageUrl = absoluteUrl('/discipline');
  const title = `Discipline sportive e attività | ${SITE_NAME}`;
  const description = `Esplora discipline come fitness, Pilates, nuoto, boxe e yoga e apri le pagine dedicate del catalogo Palestre in Zona.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [...featuredDisciplines, ...extraDisciplines].map((discipline, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: discipline.name,
        url: absoluteUrl(`/discipline/${discipline.slug}`)
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Discipline sportive</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Sfoglia tutte le discipline</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 sm:text-base sc-hero-lede">
        Scegli una disciplina e apri le schede collegate nel catalogo.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{totalDisciplines} discipline disponibili</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{featuredDisciplines.length} pagine dedicate</span>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Guide editoriali</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Non sai da quale disciplina partire?</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Leggi criteri pratici prima di aprire le schede delle palestre.
        </p>
        <a href="/guide" class="mt-4 inline-flex min-h-[2.75rem] items-center px-4 text-sm font-bold text-white transition sc-button">
          Apri le guide
        </a>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Pagine prioritarie</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Discipline con pagina dedicata</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Queste discipline hanno una pagina dedicata con schede collegate.
        </p>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each featuredDisciplines as discipline}
          <a href={`/discipline/${discipline.slug}`} class="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pagina dedicata</p>
              <span class="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">{discipline.count}</span>
            </div>
            <h3 class="mt-2 text-lg font-bold text-slate-900">{discipline.name}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">{shortDescription(discipline.description)}</p>
            <div class="mt-auto flex items-center justify-between gap-3 pt-4">
              <span class="text-sm font-semibold text-emerald-800">{formatCount(discipline.count, 'scheda pubblica', 'schede pubbliche')}</span>
              <span class="inline-flex min-h-[2.35rem] items-center px-3 text-sm font-bold sc-button">Apri</span>
            </div>
          </a>
        {/each}
      </div>
    </section>

    {#if extraDisciplines.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Catalogo completo</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Altre discipline presenti nel catalogo</h2>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {#each extraDisciplines as discipline}
            <a href={`/discipline/${discipline.slug}`} class="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div class="flex items-start justify-between gap-3">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Disciplina</p>
                <span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{discipline.count}</span>
              </div>
              <h3 class="mt-2 text-lg font-bold text-slate-900">{discipline.name}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{shortDescription(discipline.description || `Schede pubbliche collegate a ${discipline.name}.`)}</p>
              <div class="mt-auto flex items-center justify-between gap-3 pt-4">
                <span class="text-sm font-semibold text-slate-700">{formatCount(discipline.count, 'scheda collegata', 'schede collegate')}</span>
                <span class="inline-flex min-h-[2.35rem] items-center px-3 text-sm font-bold sc-button sc-button--secondary">Apri</span>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>


