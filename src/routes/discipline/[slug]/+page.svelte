<script>
  import { disciplinePreviewForGym, gymHref, imageForGym, isPremiumGym, isVerifiedGym } from '$lib/gym-detail';
  import { publicCityForGym } from '$lib/location-quality';
  import { slugifySeoName } from '$lib/seo-directory';
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';
  import { editorialGuideHref } from '$lib/editorial';
  import { buildDisciplineSeoMeta } from '$lib/seo-meta';
  import { formatCount } from '$lib/text-format';
  import { contextualCardDescription } from '$lib/gym-description';

  export let data;

  const { discipline, gyms, relatedGuides = [] } = data;
  const pageUrl = absoluteUrl(`/discipline/${discipline.slug}`);
  const seoMeta = buildDisciplineSeoMeta(discipline.name);
  const title = seoMeta.title;
  const description = seoMeta.description;
  const isIndexableLanding = gyms.length >= 2;
  const cityStats = [...gyms
    .reduce((map, gym) => {
      const city = publicCityForGym(gym);
      if (!city) return map;
      map.set(city, (map.get(city) || 0) + 1);
      return map;
    }, new Map())
    .entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
    .slice(0, 6);
  const exampleAreas = cityStats.map(([city]) => city).join(', ');
  const cityLinks = cityStats.map(([city, count]) => ({
    city,
    count,
    href: `/zone/${slugifySeoName(city)}`
  }));
  const publicHoursLabel = (value) => {
    const label = String(value || '').trim();
    return !label || label === 'Orari da verificare' || label === 'Orari n/d' ? 'Orari da confermare' : label;
  };
  const hasContactSignal = (gym) => Boolean(String(gym.phone || '').trim() || String(gym.website || '').trim());
  const faqItems = [
    {
      question: `Che cosa trovo nella pagina ${discipline.title}?`,
      answer: `La pagina raccoglie ${formatCount(gyms.length, 'scheda pubblica', 'schede pubbliche')} legate a ${discipline.name}. Serve a vedere subito quali strutture del catalogo ricadono davvero in questa disciplina.`
    },
    {
      question: `In quali zone sono presenti più schede di ${discipline.name}?`,
      answer: exampleAreas
        ? `Le aree con più schede in questa raccolta sono ${exampleAreas}.`
        : `Per questa disciplina abbiamo ancora poche zone con schede pubbliche.`
    },
    {
      question: `Perché aprire la scheda di una palestra di ${discipline.name}?`,
      answer: `Nella scheda puoi controllare indirizzo, orari, contatti e discipline associate prima di contattare la struttura.`
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
          about: discipline.name,
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
              name: 'Discipline',
              item: absoluteUrl('/discipline')
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: discipline.title,
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

  function imageMetaForGym(gym) {
    const image = imageForGym(gym);
    return typeof image === 'string' ? { src: image, candidates: [image], fallback: image } : image;
  }

  function handleImageError(event, image) {
    const img = event.currentTarget;
    if (!img || !image) return;

    const nextIndex = Number(img.dataset.imageIndex || '0') + 1;
    if (nextIndex < image.candidates.length) {
      img.dataset.imageIndex = String(nextIndex);
      img.src = image.candidates[nextIndex];
      return;
    }

    if (image.fallback && img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.src = image.fallback;
    }
  }
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
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Landing disciplina</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{discipline.title}</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{discipline.description}</p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{formatCount(gyms.length, 'scheda disponibile', 'schede disponibili')}</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{discipline.name}</span>
        {#each cityStats.slice(0, 3) as [city, count]}
          <a href={`/zone/${slugifySeoName(city)}`} class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">{city}: {count}</a>
        {/each}
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Panoramica della disciplina</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come leggere il catalogo di {discipline.name}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Qui compaiono le schede che nel catalogo risultano legate a {discipline.name}. Parti da un elenco gia filtrato.
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          Le strutture pubblicate in questa pagina coprono soprattutto queste aree: <strong>{exampleAreas || 'zone già presenti nel catalogo'}</strong>.
          Nella scheda puoi controllare impostazione tecnica, contatti, orari e distanza dalla tua zona.
        </p>
      </div>
    </section>

    {#if cityStats.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Zone più presenti</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Dove trovi più schede di {discipline.name}</h2>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each cityLinks as item}
            <a href={item.href} class="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md sc-detail-card">
              <span class="sr-only">Apri le palestre a {item.city}</span>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{item.city}</p>
              <p class="mt-2 text-2xl font-bold text-slate-900">{item.count}</p>
              <p class="mt-1 text-sm font-semibold text-slate-600">{formatCount(item.count, 'scheda collegata', 'schede collegate')}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if cityLinks.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Percorsi locali</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Zone dove confrontare {discipline.name}</h2>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          {#each cityLinks as item}
            <a href={item.href} class="inline-flex min-h-[2.75rem] items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-50">
              {item.city}
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if relatedGuides.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Guide collegate</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Leggi prima di contattare</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Queste guide spiegano differenze, criteri e controlli pratici legati a {discipline.name}.
          </p>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          {#each relatedGuides as guide}
            <a href={editorialGuideHref(guide)} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{guide.readingMinutes} min</p>
              <h3 class="mt-2 text-base font-bold leading-tight text-slate-900">{guide.title}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{guide.description}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Come usarla</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come usare questa pagina</h2>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Focus</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Qui trovi schede collegate a {discipline.name} senza rifare il filtro.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Confronto</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Confronta indirizzo, orari e discipline prima di aprire la scheda.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contesto locale</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Il conteggio per zona mostra dove abbiamo più schede per questa disciplina.</p>
        </div>
      </div>
    </section>

    <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#if gyms.length === 0}
        <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
          <p class="text-slate-600">Per questa disciplina non ci sono ancora abbastanza schede pubbliche curate.</p>
        </div>
      {:else}
        {#each gyms as gym, i}
          {@const image = imageMetaForGym(gym)}
          {@const disciplinePreview = disciplinePreviewForGym(gym, 3, discipline.name)}
          {@const cardDescription = contextualCardDescription(gym, discipline.name)}
          {@const verified = isVerifiedGym(gym)}
          {@const premium = isPremiumGym(gym)}
          <article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sc-card sc-gym-card" style={`animation-delay:${i * 20}ms`}>
            <div class="relative h-44 overflow-hidden">
              <img
                src={image.src}
                alt={`Immagine ${gym.name}`}
                class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                width="360"
                height="176"
                sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw"
                on:error={(event) => handleImageError(event, image)}
              />
              <span class="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-bold text-white sc-badge sc-badge--accent">
                {disciplinePreview.primary}
              </span>
            </div>
            <div class="space-y-3 p-3 sm:p-4">
              <div class="space-y-1 rounded-2xl sc-gym-card-head p-3">
                <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">{discipline.name}</p>
                <h2 class="text-lg font-bold leading-tight text-slate-900">{gym.name}</h2>
                <div class="mt-3 flex flex-wrap gap-2 sc-discipline-list">
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
                  {#if verified}
                    <span class="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] sc-badge sc-badge--success">Verificata</span>
                  {/if}
                  {#if premium}
                    <span class="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-800">Premium</span>
                  {/if}
                </div>
              </div>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm leading-6 text-slate-700">
                {cardDescription || 'Descrizione in verifica editoriale'}
              </p>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Indirizzo:</strong> {[gym.address, gym.city].filter(Boolean).join(', ') || 'Indirizzo non disponibile'}</p>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Orari:</strong> {publicHoursLabel(gym.hours_info)}</p>
              <div class="flex flex-wrap gap-2 text-xs font-bold sc-card-signal-list">
                <span class={`rounded-full px-2.5 py-1 ${hasContactSignal(gym) ? 'sc-card-signal--ok' : 'sc-card-signal--muted'}`}>
                  {hasContactSignal(gym) ? 'Contatti disponibili' : 'Contatti da verificare'}
                </span>
                <span class={`rounded-full px-2.5 py-1 ${gym.latitude && gym.longitude ? 'sc-card-signal--ok' : 'sc-card-signal--muted'}`}>
                  {gym.latitude && gym.longitude ? 'Indicazioni disponibili' : 'Indicazioni da verificare'}
                </span>
              </div>
              <div class="rounded-2xl sc-gym-card-cta p-3">
                <a href={gymHref(gym)} class="inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold transition sc-button sc-button--primary">
                  Apri scheda
                </a>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Domande frequenti</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">FAQ su {discipline.name}</h2>
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




