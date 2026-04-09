<script>
  import { disciplinePreviewForGym, gymHref, imageForGym } from '$lib/gym-detail';
  import { absoluteUrl, SITE_NAME } from '$lib/site';

  export let data;

  const { discipline, gyms } = data;
  const pageUrl = absoluteUrl(`/discipline/${discipline.slug}`);
  const title = `${discipline.title} | ${SITE_NAME}`;
  const description = `${discipline.description} In questa pagina trovi ${gyms.length} schede pubbliche dedicate.`;
  const exampleAreas = [...new Set(gyms.map((gym) => String(gym.city || '').trim()).filter(Boolean))].slice(0, 6).join(', ');
  const structuredData = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: pageUrl,
      about: discipline.name,
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Landing disciplina</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{discipline.title}</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{discipline.description}</p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{gyms.length} schede disponibili</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{discipline.name}</span>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Panoramica della disciplina</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come usare questa pagina per trovare una palestra di {discipline.name}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Questa sezione è pensata per chi cerca una disciplina specifica e vuole arrivare rapidamente a una short-list utile. Invece di
          filtrare da zero tutto il catalogo, qui trovi solo le schede che nel nostro database risultano legate a {discipline.name}.
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          Le strutture pubblicate in questa pagina coprono soprattutto queste aree: <strong>{exampleAreas || 'zone già presenti nel catalogo'}</strong>.
          Aprendo una scheda completa puoi verificare se la palestra è coerente con ciò che cerchi davvero: impostazione tecnica, contatti, orari
          e praticità rispetto alla tua posizione.
        </p>
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
          {@const disciplinePreview = disciplinePreviewForGym(gym, 4)}
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
                {disciplinePreview.primary}
              </span>
            </div>
            <div class="space-y-3 p-3 sm:p-4">
              <div class="space-y-1 rounded-2xl sc-gym-card-head p-3">
                <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">{discipline.name}</p>
                <h2 class="text-lg font-bold leading-tight text-slate-900">{gym.name}</h2>
                {#if disciplinePreview.secondary.length || disciplinePreview.remaining}
                  <div class="mt-3 flex flex-wrap gap-2">
                    {#each disciplinePreview.secondary as label}
                      <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{label}</span>
                    {/each}
                    {#if disciplinePreview.remaining}
                      <span class="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">+{disciplinePreview.remaining}</span>
                    {/if}
                  </div>
                {/if}
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
