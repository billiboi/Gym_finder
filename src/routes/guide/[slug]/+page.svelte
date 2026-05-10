<script>
  import {
    disciplineMetaForGuide,
    editorialGuideHref,
    getDisciplineCluster,
    getEditorialTemplate
  } from '$lib/editorial';
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';

  export let data;

  const { guide, relatedGuides = [] } = data;
  const pageUrl = absoluteUrl(editorialGuideHref(guide));
  const template = getEditorialTemplate(guide.template);
  const cluster = getDisciplineCluster(guide.cluster);
  const disciplines = disciplineMetaForGuide(guide);
  const title = `${guide.title} | ${SITE_NAME}`;
  const description = guide.description;
  const faqItems = guide.faqs || [];
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description,
        dateModified: guide.updatedAt,
        datePublished: guide.updatedAt,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        author: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: absoluteUrl('/')
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: absoluteUrl('/')
        },
        about: disciplines.map((discipline) => discipline.name)
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Guide', item: absoluteUrl('/guide') },
          { '@type': 'ListItem', position: 3, name: guide.title, item: pageUrl }
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
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content="article" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  {@html structuredDataScript}
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <main class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <article class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-8">
      <nav class="flex flex-wrap gap-2 text-sm" aria-label="Breadcrumb">
        <a href="/guide" class="sc-ui-pill px-3 py-2">Guide</a>
        {#if cluster}
          <span class="sc-ui-pill px-3 py-2">{cluster.name}</span>
        {/if}
      </nav>

      <header class="mt-5">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">
          {template?.name || 'Guida'} - {guide.readingMinutes} min
        </p>
        <h1 class="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">{guide.title}</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-600">{guide.intro}</p>
      </header>

      <div class="mt-6 flex flex-wrap gap-2">
        {#each disciplines as discipline}
          <a href={discipline.href} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{discipline.name}</a>
        {/each}
        {#each guide.locations as slug}
          <a href={`/zone/${slug}`} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{slug}</a>
        {/each}
      </div>

      <div class="mt-8 grid gap-5">
        {#each guide.sections as section}
          <section class="rounded-2xl border border-slate-200 bg-white/90 p-5">
            <h2 class="text-2xl font-bold leading-tight text-slate-900">{section.heading}</h2>
            <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{section.body}</p>
          </section>
        {/each}
      </div>

      <section class="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-5">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Link interni</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Continua la ricerca nel catalogo</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <a href="/" class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 class="text-base font-bold text-slate-900">Cerca palestre sulla mappa</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">Apri la ricerca principale e confronta schede, distanza e risultati.</p>
          </a>
          <a href="/discipline" class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 class="text-base font-bold text-slate-900">Sfoglia le discipline</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">Passa dalle guide alle landing disciplina con schede collegate.</p>
          </a>
        </div>
      </section>

      <section class="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-5">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Domande frequenti</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">FAQ</h2>
        <div class="mt-4 grid gap-3">
          {#each faqItems as item}
            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 class="text-base font-bold text-slate-900">{item.question}</h3>
              <p class="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
            </div>
          {/each}
        </div>
      </section>
    </article>

    {#if relatedGuides.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Guide correlate</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Altri percorsi utili</h2>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          {#each relatedGuides as related}
            <a href={editorialGuideHref(related)} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <h3 class="text-base font-bold leading-tight text-slate-900">{related.title}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{related.description}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>
