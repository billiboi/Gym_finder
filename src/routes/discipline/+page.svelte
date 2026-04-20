<script>
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';

  export let data;

  const { featuredDisciplines = [], extraDisciplines = [], totalDisciplines = 0 } = data;
  const pageUrl = absoluteUrl('/discipline');
  const title = `Discipline | ${SITE_NAME}`;
  const description = `Esplora le discipline presenti nel catalogo pubblico e apri le pagine dedicate o le raccolte disponibili.`;
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Hub discipline</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Sfoglia tutte le discipline</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Qui trovi l'accesso a tutte le discipline presenti nel catalogo pubblico, cos non vieni
        reindirizzato su una pagina arbitraria e puoi scegliere direttamente l'area che ti interessa.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{totalDisciplines} discipline disponibili</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{featuredDisciplines.length} pagine curate</span>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Pagine prioritarie</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Landing disciplina gi curate</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Qui trovi le discipline che hanno gi una landing dedicata e pi strutturata. Sono i punti migliori da cui
          partire se vuoi esplorare palestre con una selezione pi ordinata e una pagina pi forte anche lato SEO.
        </p>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each featuredDisciplines as discipline}
          <a href={`/discipline/${discipline.slug}`} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Landing curata</p>
            <h3 class="mt-2 text-lg font-bold text-slate-900">{discipline.name}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600">{discipline.description}</p>
            <p class="mt-3 text-sm font-semibold text-emerald-800">{discipline.count} schede pubbliche</p>
          </a>
        {/each}
      </div>
    </section>

    {#if extraDisciplines.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Catalogo completo</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Altre discipline presenti nel catalogo</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Queste discipline compaiono gi nelle schede pubbliche e ci aiutano a dare una navigazione pi sensata
            dallheader. Possiamo poi decidere quali trasformare in vere landing prioritarie.
          </p>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {#each extraDisciplines as discipline}
            <a href={`/discipline/${discipline.slug}`} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Disciplina</p>
              <h3 class="mt-2 text-lg font-bold text-slate-900">{discipline.name}</h3>
              <p class="mt-3 text-sm font-semibold text-slate-700">{discipline.count} schede collegate</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>


