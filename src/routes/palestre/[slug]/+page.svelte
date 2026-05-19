<script>
  import {
    buildGymSeoHighlights,
    buildGymPresentation,
    cityLabelForGym,
    disciplineListForGym,
    fixGymText,
    formatAddressForDisplay,
    gymHref,
    imageForGym,
    isIndexableGym,
    isPremiumGym,
    isVerifiedGym,
    officialGymOverride,
    primaryDisciplineForGym,
    structuredAddressForGym
  } from '$lib/gym-detail';
  import { isAlwaysOpen, weeklyHoursRows } from '$lib/hours';
  import { SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';
  import { appendSiteName, buildGymSeoMeta } from '$lib/seo-meta';
  import { gymTrackingPayload, trackEvent } from '$lib/tracking';

  export let data;

  let gym;
  let relatedGyms = [];
  let relatedLocation;
  let relatedDiscipline;

  function textArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => fixGymText(item)).filter(Boolean);
  }

  function publicUrl(value) {
    const url = fixGymText(value);
    return /^https?:\/\//i.test(url) ? url : '';
  }

  $: ({ gym, relatedGyms = [], relatedLocation, relatedDiscipline } = data);
  $: officialOverride = officialGymOverride(gym);
  $: disciplines = disciplineListForGym(gym);
  $: isVerified = isVerifiedGym(gym);
  $: isPremium = isPremiumGym(gym);
  $: primaryDiscipline = primaryDisciplineForGym(gym);
  $: editorialSummary = fixGymText(gym?.editorial_summary);
  $: editorialHighlights = textArray(gym?.editorial_highlights);
  $: hasEditorialContent = Boolean(editorialSummary || editorialHighlights.length);
  $: presentation = officialOverride?.presentation || editorialSummary || buildGymPresentation(gym);
  $: seoHighlights = officialOverride?.highlights || editorialHighlights.length ? (officialOverride?.highlights || editorialHighlights) : buildGymSeoHighlights(gym);
  $: officialInfoCards = officialOverride?.infoCards || [];
  $: officialScheduleCards = officialOverride?.scheduleCards || [];
  $: officialFaqItems = officialOverride?.faqItems || [];
  $: cityLabel = cityLabelForGym(gym);
  $: imageAsset = imageForGym(gym);
  $: imageMeta =
    typeof imageAsset === 'string'
      ? { src: imageAsset, candidates: [imageAsset], fallback: imageAsset }
      : imageAsset;
  $: imageSrc = imageMeta.src;
  $: hoursInfo = officialOverride?.hoursInfo || fixGymText(gym?.hours_info) || 'Orari da verificare';
  $: hoursRows = weeklyHoursRows(hoursInfo);
  $: alwaysOpen = isAlwaysOpen(hoursInfo);
  $: address = officialOverride?.address || formatAddressForDisplay(gym);
  $: structuredAddress = structuredAddressForGym(gym);
  $: isIndexable = isIndexableGym(gym);
  $: officialSourceUrl = officialOverride?.sourceUrl || fixGymText(gym?.official_source_url) || '';
  $: officialEmail = officialOverride?.email || '';
  $: officialMonthlyPrice = fixGymText(gym?.price_info) || officialOverride?.monthlyPrice || '';
  $: priceSourceUrl = fixGymText(gym?.price_source_url) || officialSourceUrl;
  $: officialSocialLinks = officialOverride?.socialLinks || [];
  $: hasOfficialData = Boolean(officialMonthlyPrice || officialSourceUrl || officialEmail || officialSocialLinks.length);
  $: phone = fixGymText(gym?.phone) || 'Non disponibile';
  $: website = officialOverride?.website || fixGymText(gym?.website) || officialSourceUrl;
  $: hasPhone = phone && phone !== 'Non disponibile';
  $: sameAsLinks = [...officialSocialLinks.map((link) => link?.href || link), website]
    .map((url) => publicUrl(url))
    .filter(Boolean);
  $: mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  $: hasCoordinates = Number.isFinite(Number(gym?.latitude)) && Number.isFinite(Number(gym?.longitude));
  $: osmEmbedHref = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(gym.longitude) - 0.01}%2C${Number(gym.latitude) - 0.008}%2C${Number(gym.longitude) + 0.01}%2C${Number(gym.latitude) + 0.008}&layer=mapnik&marker=${Number(gym.latitude)}%2C${Number(gym.longitude)}`
    : '';
  $: pageUrl = absoluteUrl(`/palestre/${data.gymSlug}`);
  $: fallbackGymSeo = buildGymSeoMeta({
    name: fixGymText(gym?.name),
    city: cityLabel,
    discipline: primaryDiscipline,
    disciplines
  });
  $: seoTitle = officialOverride?.seoTitle ? appendSiteName(officialOverride.seoTitle) : fallbackGymSeo.title;
  $: seoDescription = officialOverride?.seoDescription || fallbackGymSeo.description;
  $: claimHref = `/rivendica-scheda?gym=${encodeURIComponent(fixGymText(gym?.name))}&url=${encodeURIComponent(pageUrl)}&reason=${encodeURIComponent('Rivendicazione scheda')}&gym_id=${encodeURIComponent(gym?.id || '')}`;
  $: trackingPayload = gymTrackingPayload({ ...gym, slug: data.gymSlug, discipline: primaryDiscipline, city: cityLabel });

  $: detailStructuredData = [
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
      '@id': `${pageUrl}#gym`,
      name: fixGymText(gym?.name),
      description: presentation,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      image: imageSrc.startsWith('http') ? imageSrc : absoluteUrl(imageSrc),
      telephone: hasPhone ? phone : undefined,
      sameAs: sameAsLinks.length ? sameAsLinks : undefined,
      priceRange: officialMonthlyPrice || undefined,
      sport: disciplines,
      hasMap: mapsHref,
      address: structuredAddress,
      geo:
        gym?.latitude !== null && gym?.latitude !== undefined && gym?.longitude !== null && gym?.longitude !== undefined
          ? {
              '@type': 'GeoCoordinates',
              latitude: gym.latitude,
              longitude: gym.longitude
            }
          : undefined,
      offers: officialMonthlyPrice
        ? {
            '@type': 'Offer',
            name: `Prezzi ${fixGymText(gym?.name)}`,
            description: officialMonthlyPrice,
            url: priceSourceUrl || website || pageUrl,
            category: 'Gym membership'
          }
        : undefined
    }
  ];
  $: faqStructuredData = officialFaqItems.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: officialFaqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          }
        }))
      }
    : null;
  $: structuredData = faqStructuredData ? [...detailStructuredData, faqStructuredData] : detailStructuredData;
  $: detailStructuredDataScript = jsonLdScript(structuredData);

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
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
  <meta name="robots" content={isIndexable ? 'index,follow' : 'noindex,follow'} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={seoTitle} />
  <meta property="og:description" content={seoDescription} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:image" content={imageSrc.startsWith('http') ? imageSrc : absoluteUrl(imageSrc)} />
  <meta name="twitter:title" content={seoTitle} />
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
            decoding="async"
            fetchpriority="high"
            loading="eager"
            width="760"
            height="430"
            sizes="(min-width: 1024px) 56vw, 100vw"
            on:error={handleImageError}
          />
        </div>

        <div class="flex flex-col gap-3 p-4">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              {#each disciplines as discipline}
                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white sc-badge sc-badge--accent">
                  {discipline}
                </span>
              {/each}
              {#if isVerified}
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-900 sc-badge">Verificata</span>
              {/if}
              {#if isPremium}
                <span class="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-900 sc-badge">Premium</span>
              {/if}
            </div>

            <div class="rounded-3xl sc-detail-hero p-3.5 lg:p-4">
              <h1 class="text-4xl font-bold leading-none text-slate-900 sm:text-[3.3rem] sc-detail-title">
                {fixGymText(gym?.name)}
              </h1>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-white/92 p-2.5 sc-detail-meta">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Disciplina</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 sc-detail-value">{primaryDiscipline}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white/92 p-2.5 sc-detail-meta">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Citt&agrave;</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 sc-detail-value">{cityLabel}</p>
              </div>
            </div>

            <p class="text-sm leading-7 text-slate-600 sm:text-[0.98rem] sc-detail-copy">{presentation}</p>

            {#if officialScheduleCards.length}
              <div class="grid gap-2 sm:grid-cols-3">
                {#each officialScheduleCards as card}
                  <div class="rounded-2xl border border-emerald-900/10 bg-emerald-50/80 p-3 sc-detail-meta">
                    <p class="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-emerald-900">{card.label}</p>
                    <p class="mt-1.5 text-sm font-black leading-5 text-slate-950">{card.value}</p>
                    {#if card.body}
                      <p class="mt-1 text-xs font-semibold leading-5 text-slate-600">{card.body}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            <div class="grid gap-2 sm:grid-cols-3">
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-[2.8rem] items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 sc-button"
                on:click={() => trackEvent('click_indicazioni', trackingPayload)}
              >
                Apri mappa
              </a>
              <a
                href={hasPhone ? `tel:${phone.replace(/\s+/g, '')}` : mapsHref}
                class="inline-flex min-h-[2.8rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                on:click={() => trackEvent(hasPhone ? 'click_telefono' : 'click_indicazioni', trackingPayload)}
              >
                {hasPhone ? 'Chiama' : 'Indicazioni'}
              </a>
              {#if website}
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex min-h-[2.8rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                  on:click={() => trackEvent('click_sito', trackingPayload)}
                >
                  Apri sito
                </a>
              {:else}
                <a
                  href={claimHref}
                  class="inline-flex min-h-[2.8rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                  on:click={() => trackEvent('claim_click', trackingPayload)}
                >
                  Aggiorna dati
                </a>
              {/if}
            </div>

            {#if hasCoordinates}
              <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white sc-detail-map-preview">
                <iframe
                  title={`Mappa ${fixGymText(gym?.name)}`}
                  src={osmEmbedHref}
                  class="h-56 w-full"
                  loading="lazy"
                  width="640"
                  height="224"
                ></iframe>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200/70 p-3.5 sm:p-4.5">
        <div class="grid gap-3 lg:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">Indirizzo</p>
            <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">{address}</p>
          </div>

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
                on:click={() => trackEvent('click_sito', trackingPayload)}
              >
                Visita il sito ufficiale
              </a>
            {:else}
              <p class="mt-2 text-sm font-semibold text-slate-900 sm:text-base sc-detail-value">Non disponibile</p>
            {/if}
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-meta lg:col-span-3">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sc-detail-label">
              {officialScheduleCards.length ? 'Orari lezioni in presenza' : 'Orari'}
            </p>
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
        </div>
      </div>
    </section>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div class="flex min-w-0 flex-col gap-3">
        {#if hasOfficialData}
          <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sm:p-5">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Dati ufficiali del club</p>
                <h2 class="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">Informazioni verificate</h2>
              </div>
              {#if officialSourceUrl}
                <a
                  href={officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  Apri fonte ufficiale
                </a>
              {/if}
            </div>

            <div class="mt-4 grid gap-3">
              {#if officialMonthlyPrice}
                <div class="rounded-2xl border border-emerald-200 bg-emerald-50/75 p-4">
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-900">Prezzi indicati</p>
                  <p class="mt-2 text-base font-bold leading-7 text-slate-950 sm:text-lg">{officialMonthlyPrice}</p>
                </div>
              {/if}

              {#if officialEmail || officialSocialLinks.length || (!officialMonthlyPrice && officialSourceUrl)}
                <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Canali ufficiali</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    {#if officialEmail}
                      <a href={`mailto:${officialEmail}`} class="inline-flex min-h-[2.55rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
                        Email
                      </a>
                    {/if}
                    {#each officialSocialLinks as social}
                      <a href={social.href} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.55rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
                        {social.label}
                      </a>
                    {/each}
                    {#if !officialMonthlyPrice && officialSourceUrl}
                      <a href={officialSourceUrl} target="_blank" rel="noreferrer" class="inline-flex min-h-[2.55rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
                        Fonte ufficiale
                      </a>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if officialInfoCards.length}
                <div class="grid gap-3 sm:grid-cols-2">
                  {#each officialInfoCards as card}
                    <article class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-card">
                      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                      <h3 class="mt-2 text-base font-bold leading-6 text-slate-950">{card.value}</h3>
                      {#if card.body}
                        <p class="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                      {/if}
                    </article>
                  {/each}
                </div>
              {/if}
            </div>
          </section>
        {/if}
        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-5">
          <div class="max-w-4xl">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Verifiche rapide</p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">Cosa puoi capire prima di contattare la struttura</h2>
            <div class="mt-4 grid gap-3">
              {#each seoHighlights as highlight}
                <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-card">
                  <p class="text-sm leading-7 text-slate-700 sm:text-base">{highlight}</p>
                </div>
              {/each}
            </div>
          </div>
        </section>

        {#if relatedDiscipline || relatedLocation}
          <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-5">
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
        {/if}

        {#if relatedGyms.length}
          <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-5">
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Schede correlate</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">Altre strutture da confrontare</h2>
            </div>

            <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {#each relatedGyms as relatedGym}
                <a href={gymHref(relatedGym)} class="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md sc-detail-card">
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{primaryDisciplineForGym(relatedGym)}</p>
                  <h3 class="mt-2 text-lg font-bold text-slate-900">{fixGymText(relatedGym.name)}</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600">{formatAddressForDisplay(relatedGym)}</p>
                </a>
              {/each}
            </div>
          </section>
        {/if}

        {#if officialFaqItems.length}
          <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-5">
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">FAQ ufficiali</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">Domande utili prima di prenotare</h2>
            </div>

            <div class="mt-5 grid gap-3">
              {#each officialFaqItems as item}
                <article class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-card">
                  <h3 class="text-base font-bold leading-6 text-slate-950">{item.question}</h3>
                  <p class="mt-2 text-sm leading-7 text-slate-600 sm:text-base">{item.answer}</p>
                </article>
              {/each}
            </div>
          </section>
        {/if}

      </div>

      <aside class="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24">
        <section class="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Gestisci questa palestra</p>
            <h2 class="mt-2 text-xl font-bold text-slate-900">Richiedi accesso proprietario</h2>
            <p class="mt-3 text-sm leading-7 text-slate-600 sc-detail-copy">Aggiornare la scheda base &egrave; gratuito e non comporta obblighi pubblicitari.</p>
          </div>

          <div class="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            <div class="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 sc-detail-card">Contatti, sito e canali ufficiali</div>
            <div class="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 sc-detail-card">Orari, indirizzo e posizione</div>
            <div class="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 sc-detail-card">Discipline, descrizione e informazioni club</div>
          </div>

          <div class="mt-4 flex flex-col gap-2">
            <a href={claimHref} class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button" on:click={() => {
              trackEvent('owner_cta_click', trackingPayload);
              trackEvent('claim_click', { ...trackingPayload, posizione: 'scheda_owner_box' });
            }}>
              Gestisci questa palestra
            </a>
            <a href="/per-le-palestre" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50" on:click={() => trackEvent('partner_cta_click', { ...trackingPayload, posizione: 'scheda_owner_box' })}>
              Info per le palestre
            </a>
          </div>
        </section>
      </aside>
    </div>
  </main>

</div>
