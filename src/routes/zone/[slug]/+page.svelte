<script>
  import { gymHref, imageForGym } from '$lib/gym-detail';
  import { absoluteUrl, SITE_NAME } from '$lib/site';

  export let data;

  const { location, gyms, topDisciplines } = data;
  const pageUrl = absoluteUrl(`/zone/${location.slug}`);
  const title = `${location.title} | ${SITE_NAME}`;
  const description = `${location.description} Consulta una selezione di ${gyms.length} schede pubbliche con link ai dettagli completi.`;
  const structuredData = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: pageUrl,
      about: topDisciplines,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: gyms.slice(0, 12).map((gym, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(gymHref(gym)),
          name: gym.name
        }))
      }
    },
    null,
    0
  );

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
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <script type="application/ld+json">{structuredData}</script>
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <main class="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Landing locale</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{location.title}</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{location.description}</p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{gyms.length} schede disponibili</span>
        {#each topDisciplines as discipline}
          <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{discipline}</span>
        {/each}
      </div>
    </section>

    <section class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#if gyms.length === 0}
        <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
          <p class="text-slate-600">Per questa zona non ci sono ancora abbastanza schede pubbliche curate.</p>
        </div>
      {:else}
        {#each gyms as gym, i}
          {@const image = imageMetaForGym(gym)}
          <article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sc-card sc-gym-card" style={`animation-delay:${i * 20}ms`}>
            <div class="relative h-44 overflow-hidden">
              <img
                src={image.src}
                alt={`Immagine ${gym.name}`}
                class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
                on:error={(event) => handleImageError(event, image)}
              />
              <span class="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-bold text-white sc-badge sc-badge--accent">
                {Array.isArray(gym.disciplines) && gym.disciplines.length ? gym.disciplines.join(' | ') : gym.discipline}
              </span>
            </div>
            <div class="space-y-3 p-3 sm:p-4">
              <div class="space-y-1 rounded-2xl sc-gym-card-head p-3">
                <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">{location.name}</p>
                <h2 class="text-lg font-bold leading-tight text-slate-900">{gym.name}</h2>
              </div>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Indirizzo:</strong> {[gym.address, gym.city].filter(Boolean).join(', ') || 'Indirizzo non disponibile'}</p>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Orari:</strong> {gym.hours_info || 'Orari da verificare'}</p>
              <div class="rounded-2xl sc-gym-card-cta p-3">
                <a href={gymHref(gym)} class="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
                  Scheda completa
                </a>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </section>
  </main>
</div>

