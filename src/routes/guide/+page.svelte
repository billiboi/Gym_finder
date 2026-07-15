<script>
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';
  import { editorialGuideHref } from '$lib/editorial';

  export let data;

  const { guides = [], clusters = [] } = data;
  const pageUrl = absoluteUrl('/guide');
  const title = `Guide palestra, discipline e scelta corsi | ${SITE_NAME}`;
  const description =
    'Guide pratiche per scegliere palestre, confrontare discipline e usare meglio schede, zone e contatti del catalogo.';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: guide.title,
        url: absoluteUrl(editorialGuideHref(guide))
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] sc-hero-kicker">Guide</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Scegli palestra e disciplina con più criterio</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 sm:text-base sc-hero-lede">
        Articoli brevi e collegati al catalogo: ogni guida porta verso discipline, zone e schede utili per passare dalla lettura alla ricerca.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{guides.length} guide pubblicate</span>
        <a href="/discipline" class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">Discipline</a>
        <a href="/zone" class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">Zone</a>
      </div>
    </section>

    <section class="mt-5 grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
      <div class="grid gap-3 sm:grid-cols-2">
        {#each guides as guide}
          <article class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{guide.readingMinutes} min</p>
            <h2 class="mt-2 text-xl font-bold leading-tight text-slate-900">
              <a href={editorialGuideHref(guide)}>{guide.title}</a>
            </h2>
            <p class="mt-3 text-sm leading-7 text-slate-600">{guide.description}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              {#each guide.disciplines.slice(0, 3) as slug}
                <a href={`/discipline/${slug}`} class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50">{slug}</a>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      <aside class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Cluster editoriali</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Percorsi tematici</h2>
        <div class="mt-5 grid gap-3">
          {#each clusters as cluster}
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <h3 class="text-base font-bold text-slate-900">{cluster.name}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{cluster.description}</p>
              <div class="mt-3 grid gap-2">
                {#each cluster.guides as guide}
                  <a href={editorialGuideHref(guide)} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-snug text-slate-800 transition hover:bg-slate-50">{guide.title}</a>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </aside>
    </section>
  </main>
</div>
