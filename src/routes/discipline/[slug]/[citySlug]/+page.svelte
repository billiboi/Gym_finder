<script>
  import { gymHref } from '$lib/gym-detail';
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';
  import { buildDisciplineCitySeoMeta } from '$lib/seo-meta';
  import { formatCount } from '$lib/text-format';
  import { contextualCardDescription } from '$lib/gym-description';
  import GymCard from '$lib/components/GymCard.svelte';

  export let data;

  const { discipline, location, gyms } = data;
  const totalGyms = data.totalGyms || gyms.length;
  const hasMoreFromServer = Boolean(data.hasMoreGyms);
  const isIndexableLanding = Boolean(data.isIndexableLanding);
  const pageUrl = absoluteUrl(`/discipline/${discipline.slug}/${location.slug}`);
  const disciplineHref = `/discipline/${discipline.slug}`;
  const cityHref = `/zone/${location.slug}`;

  const seoMeta = buildDisciplineCitySeoMeta(discipline.name, location.name, totalGyms, hasMoreFromServer);
  const title = seoMeta.title;
  const description = seoMeta.description;

  const faqItems = [
    {
      question: `Quante palestre di ${discipline.name} ci sono a ${location.name}?`,
      answer: `In questa pagina trovi ${formatCount(totalGyms, 'scheda pubblica', 'schede pubbliche')} di ${discipline.name} a ${location.name} o nei comuni vicini.`
    },
    {
      question: `Come scelgo tra le schede di ${discipline.name} a ${location.name}?`,
      answer: `Confronta indirizzo, orari e contatti direttamente nella scheda prima di contattare la struttura.`
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
        about: `${discipline.name} a ${location.name}`,
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
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Discipline', item: absoluteUrl('/discipline') },
          { '@type': 'ListItem', position: 3, name: discipline.name, item: absoluteUrl(disciplineHref) },
          { '@type': 'ListItem', position: 4, name: location.name, item: pageUrl }
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
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
  <main class="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <a href="/" class="transition hover:text-slate-900">Home</a>
      <span>/</span>
      <a href={disciplineHref} class="transition hover:text-slate-900">{discipline.name}</a>
      <span>/</span>
      <span class="font-semibold text-slate-900">{location.name}</span>
    </nav>

    <section class="mt-4 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-hero sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Landing disciplina + zona</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{discipline.name} a {location.name}</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 sm:text-base sc-hero-lede">
        Schede di {discipline.name} a {location.name}: indirizzo, orari e contatti in un elenco già filtrato.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{formatCount(totalGyms, 'scheda disponibile', 'schede disponibili')}</span>
        <a href={disciplineHref} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">Tutta {discipline.name}</a>
        <a href={cityHref} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">Tutte le palestre a {location.name}</a>
      </div>
    </section>

    <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#if gyms.length === 0}
        <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
          <p class="text-slate-600">Per questa combinazione non ci sono ancora abbastanza schede pubbliche curate.</p>
        </div>
      {:else}
        {#each gyms as gym, i}
          <GymCard {gym} index={i} kicker={`${discipline.name} · ${location.name}`} preferredDiscipline={discipline.name}>
            <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm leading-6 text-slate-700">
              {contextualCardDescription(gym, discipline.name) || 'Descrizione in verifica editoriale'}
            </p>
          </GymCard>
        {/each}
      {/if}
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Domande frequenti</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">FAQ su {discipline.name} a {location.name}</h2>
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
