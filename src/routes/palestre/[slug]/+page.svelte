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
    officialGymOverride,
    primaryDisciplineForGym,
    structuredAddressForGym
  } from '$lib/gym-detail';
  import { isAlwaysOpen, weeklyHoursRows } from '$lib/hours';
  import { SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  export let data;

  const { gym, relatedGyms = [], relatedLocation, relatedDiscipline } = data;
  const officialOverride = officialGymOverride(gym);
  const disciplines = disciplineListForGym(gym);
  const primaryDiscipline = primaryDisciplineForGym(gym);
  const presentation = officialOverride?.presentation || buildGymPresentation(gym);
  const seoHighlights = officialOverride?.highlights || buildGymSeoHighlights(gym);
  const faqItems = officialOverride?.faqItems || buildGymFaqItems(gym);
  const cityLabel = cityLabelForGym(gym);
  const imageAsset = imageForGym(gym);
  const imageMeta =
    typeof imageAsset === 'string'
      ? { src: imageAsset, candidates: [imageAsset], fallback: imageAsset }
      : imageAsset;
  const imageSrc = imageMeta.src;
  const hoursInfo = fixGymText(gym?.hours_info) || 'Orari da verificare';
  const hoursRows = weeklyHoursRows(hoursInfo);
  const alwaysOpen = isAlwaysOpen(hoursInfo);
  const address = formatAddressForDisplay(gym);
  const structuredAddress = structuredAddressForGym(gym);
  const isIndexable = isIndexableGym(gym);
  const officialSourceUrl = officialOverride?.sourceUrl || '';
  const officialEmail = officialOverride?.email || '';
  const officialMonthlyPrice = officialOverride?.monthlyPrice || '';
  const officialSocialLinks = officialOverride?.socialLinks || [];
  const officialInfoCards = officialOverride?.infoCards || [];
  const officialCards = (() => {
    const cards = officialInfoCards.map((card) => ({ ...card }));
    const hasFormulaCard = cards.some((card) => String(card.label || '').trim().toLowerCase() === 'formula');

    if (officialMonthlyPrice && !hasFormulaCard) {
      cards.unshift({
        label: 'Formula',
        value: officialMonthlyPrice
      });
    }

    return cards.map((card, index) => ({
      ...card,
      featured: index === 0 && String(card.label || '').trim().toLowerCase() === 'formula'
    }));
  })();
  const phone = fixGymText(gym?.phone) || 'Non disponibile';
  const website = fixGymText(gym?.website) || officialOverride?.website || officialSourceUrl;
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
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-8 pt-3 sm:px-6 lg:px-8">
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
      <div class="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <div class="relative min-h-[260px] bg-slate-100 lg:min-h-[430px]">
          <img
            src={imageSrc}
            alt={`Foto di ${fixGymText(gym?.name)}`}
            class="h-full min-h-[260px] w-full object-cover"
            on:error={handleImageError}
          />
        </div>

        <div class="flex flex-col gap-3 p-4 lg:justify-between">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              {#each disciplines as discipline}
                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white sc-badge sc-badge--accent">
                  {discipline}
                </span>
              {/each}
            </div>

            <div class="rounded-3xl sc-detail-hero p-4 lg:p-5">
              <h1 class="text-4xl font-bold leading-none text-slate-900 sm:text-[3.3rem] sc-detail-title">
                {fixGymText(gym?.name)}
              </h1>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-white/92 p-3 sc-detail-meta">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Disciplina</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 sc-detail-value">{primaryDiscipline}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white/92 p-3 sc-detail-meta">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Citt&agrave;</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 sc-detail-value">{cityLabel}</p>
              </div>
            </div>
          </div>

          <p class="text-sm leading-7 text-slate-600 sm:text-[0.98rem] sc-detail-copy">{presentation}</p>
        </div>
      </div>

      <div class="border-t border-slate-200/70 p-3.5 sm:p-4.5">
        <div class="grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.55fr)_minmax(240px,0.85fr)] lg:items-start">
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Indirizzo</p>
            <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{address}</p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Orari</p>
            {#if hoursRows.length}
              <div class="mt-2 space-y-2">
                {#if alwaysOpen}
                  <div class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                    Aperta 24/7
                  </div>
                {/if}
                <div class="grid gap-1.5 text-sm text-slate-900 sm:text-base md:grid-cols-2 xl:grid-cols-3">
                  {#each hoursRows as row}
                    <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <span class="font-bold text-slate-700">{row.dayLabel}</span>
                      <span class={`text-right font-semibold ${row.isClosed ? 'text-slate-400' : 'text-slate-900'}`}>{row.label}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{hoursInfo}</p>
            {/if}
          </div>

          <div class="grid gap-3">
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Telefono</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{phone}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
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

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div class="flex min-w-0 flex-col gap-3">
        {#if officialOverride}
          <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
            <div class="max-w-4xl">
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Dati ufficiali del club</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">Le informazioni pi&ugrave; importanti da vedere subito</h2>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {#if officialCards.length}
                {#each officialCards as card}
                  <div class={`rounded-2xl border p-4 ${card.featured ? 'border-emerald-300 bg-emerald-50/80 md:col-span-2 xl:col-span-3' : 'border-slate-200 bg-white/90'}`}>
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                    {#if card.value}
                      <p class={`mt-2 font-bold text-slate-900 ${card.featured ? 'text-2xl leading-tight sm:text-[1.9rem]' : 'text-lg'}`}>{card.value}</p>
                    {/if}
                    {#if card.body}
                      <p class="mt-2 text-sm leading-7 text-slate-700">{card.body}</p>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>

            <div class="mt-4 flex flex-wrap gap-3">
              {#if officialEmail}
                <a href={`mailto:${officialEmail}`} class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
                  Scrivi a {officialEmail}
                </a>
              {/if}
              {#each officialSocialLinks as social}
                <a href={social.href} target="_blank" rel="noreferrer" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
                  {social.label}
                </a>
              {/each}
              {#if officialSourceUrl}
                <a href={officialSourceUrl} target="_blank" rel="noreferrer" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
                  Fonte ufficiale club
                </a>
              {/if}
            </div>
          </section>
        {/if}

        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
          <div class="max-w-3xl">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Presentazione</p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">Cosa sapere prima di contattarla</h2>
            <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base sc-detail-copy">{presentation}</p>
          </div>
        </section>

        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
          <div class="max-w-4xl">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Verifiche rapide</p>
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

        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Percorsi utili</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">Altre opzioni vicine da confrontare</h2>
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

        {#if relatedGyms.length}
          <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Schede correlate</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">Altre strutture da confrontare</h2>
            </div>

            <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
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
      </div>

      <aside class="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24">
        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sc-detail-actions sm:p-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Contatti rapidi</p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">Raggiungi la palestra in un attimo</h2>
            <p class="mt-2 text-sm text-slate-600 sc-detail-copy">Mappa, telefono e sito in un unico punto.</p>
          </div>

          <div class="mt-4 grid gap-3">
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
              <p class="mt-2 text-sm text-slate-600 sc-detail-copy">{website || 'Puoi comunque aprire la posizione sulla mappa.'}</p>
            </a>
          </div>

          <div class="mt-4 flex flex-col gap-2">
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

        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Gestisci questa scheda</p>
            <h2 class="mt-2 text-xl font-bold text-slate-900">Se rappresenti la palestra, puoi chiedere un aggiornamento</h2>
            <p class="mt-3 text-sm leading-7 text-slate-600 sc-detail-copy">Percorso guidato per correzioni, integrazioni o rivendicazione della scheda pubblica.</p>
          </div>

          <div class="mt-4 flex flex-col gap-2">
            <a href={claimHref} class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
              Rivendica o aggiorna
            </a>
            <a href="/per-le-palestre" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
              Info per le palestre
            </a>
          </div>
        </section>
      </aside>
    </div>
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
