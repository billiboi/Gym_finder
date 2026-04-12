<script>
  import {
    buildGymFaqItems,
    buildGymSeoHighlights,
    buildGymPresentation,
    cityLabelForGym,
    disciplineListForGym,
    fixGymText,
    formatAddressForDisplay,
    gymHref,
    imageForGym,
    isIndexableGym,
    primaryDisciplineForGym,
    structuredAddressForGym
  } from '$lib/gym-detail';
  import { SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  export let data;

  const { gym, relatedGyms = [], relatedLocation, relatedDiscipline } = data;
  const disciplines = disciplineListForGym(gym);
  const primaryDiscipline = primaryDisciplineForGym(gym);
  const presentation = buildGymPresentation(gym);
  const seoHighlights = buildGymSeoHighlights(gym);
  const faqItems = buildGymFaqItems(gym);
  const cityLabel = cityLabelForGym(gym);
  const imageAsset = imageForGym(gym);
  const imageMeta =
    typeof imageAsset === 'string'
      ? { src: imageAsset, candidates: [imageAsset], fallback: imageAsset }
      : imageAsset;
  const imageSrc = imageMeta.src;
  const hoursInfo = fixGymText(gym?.hours_info) || 'Orari da verificare';
  const address = formatAddressForDisplay(gym);
  const structuredAddress = structuredAddressForGym(gym);
  const isIndexable = isIndexableGym(gym);
  const phone = fixGymText(gym?.phone) || 'Non disponibile';
  const website = fixGymText(gym?.website);
  const hasPhone = phone && phone !== 'Non disponibile';
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const pageUrl = absoluteUrl(`/palestre/${data.gymSlug}`);
  const seoDescription = `${fixGymText(gym?.name)}: ${primaryDiscipline} a ${address}. ${presentation}`;
  const claimHref = `/rivendica-scheda?gym=${encodeURIComponent(fixGymText(gym?.name))}&url=${encodeURIComponent(pageUrl)}&reason=${encodeURIComponent('Aggiornamento o rivendicazione scheda')}`;

  const detailStructuredData = [
      {
        '@context': 'https://schema.org',
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
            name: fixGymText(gym?.name),
            item: pageUrl
          }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SportsActivityLocation',
        name: fixGymText(gym?.name),
        description: presentation,
        url: pageUrl,
        image: imageSrc.startsWith('http') ? imageSrc : absoluteUrl(imageSrc),
        telephone: hasPhone ? phone : undefined,
        sameAs: website || undefined,
        sport: disciplines,
        address: structuredAddress,
        geo:
          gym?.latitude !== null && gym?.latitude !== undefined && gym?.longitude !== null && gym?.longitude !== undefined
            ? {
                '@type': 'GeoCoordinates',
                latitude: gym.latitude,
                longitude: gym.longitude
              }
            : undefined
      },
      {
        '@context': 'https://schema.org',
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
    ];
  const detailStructuredDataScript = jsonLdScript(detailStructuredData);

  function handleImageError(event) {
    const img = event.currentTarget;
    if (!img) return;

    const nextIndex = Number(img.dataset.imageIndex || '0') + 1;
    if (nextIndex < imageMeta.candidates.length) {
      img.dataset.imageIndex = String(nextIndex);
      img.src = imageMeta.candidates[nextIndex];
      return;
    }

    if (imageMeta.fallback && img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.src = imageMeta.fallback;
    }
  }
</script>

<svelte:head>
  <title>{fixGymText(gym?.name)} | {SITE_NAME}</title>
  <meta name="description" content={seoDescription} />
  <meta name="robots" content={isIndexable ? 'index,follow' : 'noindex,follow'} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={`${fixGymText(gym?.name)} | ${SITE_NAME}`} />
  <meta property="og:description" content={seoDescription} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:image" content={imageSrc.startsWith('http') ? imageSrc : absoluteUrl(imageSrc)} />
  <meta name="twitter:title" content={`${fixGymText(gym?.name)} | ${SITE_NAME}`} />
  <meta name="twitter:description" content={seoDescription} />
  <meta name="twitter:image" content={imageSrc.startsWith('http') ? imageSrc : absoluteUrl(imageSrc)} />
  {@html detailStructuredDataScript}
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <a href="/" class="transition hover:text-slate-900">Home</a>
      <span>/</span>
      {#if relatedDiscipline}
        <a href={`/discipline/${relatedDiscipline.slug}`} class="transition hover:text-slate-900">{relatedDiscipline.name}</a>
        <span>/</span>
      {/if}
      <span class="font-semibold text-slate-900">{fixGymText(gym?.name)}</span>
    </nav>

    <section class="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-xl backdrop-blur-sm sc-panel">
      <div class="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="relative min-h-[280px] bg-slate-100">
          <img
            src={imageSrc}
            alt={`Foto di ${fixGymText(gym?.name)}`}
            class="h-full min-h-[280px] w-full object-cover"
            on:error={handleImageError}
          />
        </div>

        <div class="flex flex-col justify-between gap-5 p-4 sm:p-7">
          <div class="space-y-4">
            <div class="flex flex-wrap gap-2">
              {#each disciplines as discipline}
                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white sc-badge sc-badge--accent">
                  {discipline}
                </span>
              {/each}
            </div>

            <div class="rounded-3xl sc-detail-hero p-4 sm:p-5">
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800 sc-detail-kicker">Scheda palestra</p>
              <h1 class="mt-2 text-4xl font-bold leading-none text-slate-900 sm:text-5xl sc-detail-title">
                {fixGymText(gym?.name)}
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sc-detail-copy">
                Tutto quello che ti serve per valutare rapidamente una palestra di {primaryDiscipline}{cityLabel ? ` a ${cityLabel}` : ''}: discipline, contatti, orari e accesso immediato ai riferimenti ufficiali.
              </p>
            </div>

            <p class="text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">{presentation}</p>
          </div>

          <div class="grid gap-2 sm:gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Indirizzo</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{address}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Orari</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{hoursInfo}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Telefono</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{phone}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Sito web</p>
              {#if website}
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  class="mt-2 inline-flex text-sm font-semibold text-emerald-800 underline decoration-2 underline-offset-2 sc-detail-link"
                >
                  Visita il sito ufficiale
                </a>
              {:else}
                <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">Non disponibile</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Presentazione</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Allenati anche quando sei fuori zona</h2>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
          {presentation}
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
          In questa scheda trovi i dettagli essenziali per capire rapidamente se la palestra e adatta
          alle tue esigenze: discipline praticate, indirizzo, orari e contatti diretti.
        </p>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Perche questa pagina e utile</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Cosa puoi capire prima di contattare la struttura</h2>
        <div class="mt-4 grid gap-3">
          {#each seoHighlights as highlight}
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p class="text-sm leading-7 text-slate-700 sm:text-base">{highlight}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sc-detail-actions sm:p-7">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Contatti rapidi</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Raggiungi la palestra in un attimo</h2>
          <p class="mt-2 text-sm text-slate-600 sc-detail-copy">
            Apri il percorso, chiama direttamente o visita il sito ufficiale.
          </p>
        </div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-3">
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md sc-detail-meta sc-contact-card"
        >
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Percorso</p>
          <p class="mt-2 text-base font-bold text-slate-900 sc-detail-value">Apri in mappa</p>
          <p class="mt-2 text-sm text-slate-600 sc-detail-copy">{address}</p>
        </a>

        <a
          href={hasPhone ? `tel:${phone.replace(/\s+/g, '')}` : mapsHref}
          class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md sc-detail-meta sc-contact-card"
        >
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Telefono</p>
          <p class="mt-2 text-base font-bold text-slate-900 sc-detail-value">{hasPhone ? 'Chiama ora' : 'Contatto non disponibile'}</p>
          <p class="mt-2 text-sm text-slate-600 sc-detail-copy">{phone}</p>
        </a>

        <a
          href={website || mapsHref}
          target={website ? '_blank' : undefined}
          rel={website ? 'noreferrer' : undefined}
          class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md sc-detail-meta sc-contact-card"
        >
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Online</p>
          <p class="mt-2 text-base font-bold text-slate-900 sc-detail-value">{website ? 'Visita il sito' : 'Nessun sito indicato'}</p>
          <p class="mt-2 text-sm text-slate-600 sc-detail-copy">
            {website || 'Puoi comunque aprire la posizione sulla mappa.'}
          </p>
        </a>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Decisione rapida</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Se la struttura ti sembra adatta, fai il passo successivo</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
            Qui sotto trovi i tre passaggi piu utili: aprire il percorso, chiamare la palestra oppure visitare il sito ufficiale per approfondire.
          </p>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button"
        >
          Apri in mappa
        </a>
        <a
          href={hasPhone ? `tel:${phone.replace(/\s+/g, '')}` : mapsHref}
          class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
        >
          {hasPhone ? 'Chiama la palestra' : 'Contatto non disponibile'}
        </a>
        {#if website}
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
          >
            Visita il sito
          </a>
        {/if}
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Percorsi utili</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Continua la ricerca senza ripartire da zero</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
            Se questa scheda ti interessa, puoi continuare a esplorare la stessa disciplina o la stessa zona per confrontare strutture simili in modo piu rapido.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if relatedDiscipline}
            <a href={`/discipline/${relatedDiscipline.slug}`} class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50">
              Altre palestre di {relatedDiscipline.name}
            </a>
          {/if}
          {#if relatedLocation}
            <a href={`/zone/${relatedLocation.slug}`} class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50">
              Esplora {relatedLocation.name}
            </a>
          {/if}
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Gestisci questa scheda</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Se rappresenti la palestra, puoi chiedere un aggiornamento</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
            Se sei il gestore o fai parte dello staff, puoi usare un percorso guidato per richiedere correzioni, integrazioni o la rivendicazione della scheda pubblica.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <a href={claimHref} class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
            Rivendica o aggiorna
          </a>
          <a href="/per-le-palestre" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
            Info per le palestre
          </a>
        </div>
      </div>
    </section>

    {#if relatedGyms.length}
      <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Schede correlate</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Altre strutture da confrontare</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">
            Qui trovi alcune schede vicine per disciplina o per area geografica, utili se vuoi confrontare rapidamente piu opzioni.
          </p>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-3">
          {#each relatedGyms as relatedGym}
            <a href={gymHref(relatedGym)} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{primaryDisciplineForGym(relatedGym)}</p>
              <h3 class="mt-2 text-lg font-bold text-slate-900">{fixGymText(relatedGym.name)}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{formatAddressForDisplay(relatedGym)}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Domande frequenti</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Informazioni rapide sulla scheda</h2>
      </div>

      <div class="mt-5 grid gap-3">
        {#each faqItems as item}
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <h3 class="text-base font-bold text-slate-900">{item.question}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">{item.answer}</p>
          </div>
        {/each}
      </div>
    </section>
  </main>

  <div class="sc-mobile-actionbar md:hidden">
    <div class="grid grid-cols-3 gap-2 rounded-[1.35rem] border border-white/70 bg-white/92 p-3 shadow-2xl backdrop-blur-sm">
      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        class="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white sc-button"
      >
        Mappa
      </a>
      <a
        href={hasPhone ? `tel:${phone.replace(/\s+/g, '')}` : mapsHref}
        class="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
      >
        {hasPhone ? 'Chiama' : 'Contatto'}
      </a>
      <a
        href={website || mapsHref}
        target={website ? '_blank' : undefined}
        rel={website ? 'noreferrer' : undefined}
        class="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
      >
        {website ? 'Sito' : 'Dettagli'}
      </a>
    </div>
  </div>
</div>

