<script>
  import { disciplinePreviewForGym, gymHref, imageForGym } from '$lib/gym-detail';
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';

  export let data;

  const { discipline, gyms } = data;
  const pageUrl = absoluteUrl(`/discipline/${discipline.slug}`);
  const title = `${discipline.title} | ${SITE_NAME}`;
  const description = `${discipline.description} ${gyms.length} schede pubbliche in catalogo.`;
  const isIndexableLanding = gyms.length >= 2;
  const cityStats = [...gyms
    .reduce((map, gym) => {
      const city = String(gym.city || '').trim();
      if (!city) return map;
      map.set(city, (map.get(city) || 0) + 1);
      return map;
    }, new Map())
    .entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
    .slice(0, 6);
  const exampleAreas = cityStats.map(([city]) => city).join(', ');
  const hasContactSignal = (gym) => Boolean(String(gym.phone || '').trim() || String(gym.website || '').trim());
  const faqItems = [
    {
      question: `Che cosa trovo nella pagina ${discipline.title}?`,
      answer: `La pagina raccoglie ${gyms.length} schede pubbliche legate a ${discipline.name}. Serve a vedere subito quali strutture del catalogo ricadono davvero in questa disciplina.`
    },
    {
      question: `In quali zone sono presenti più schede di ${discipline.name}?`,
      answer: exampleAreas
        ? `Le aree che emergono di più in questa raccolta sono ${exampleAreas}.`
        : `Le zone coperte da questa disciplina si stanno ampliando e la raccolta locale è ancora in crescita.`
    },
    {
      question: `Perché aprire la scheda completa di una palestra di ${discipline.name}?`,
      answer: `Aprendo la scheda completa puoi controllare indirizzo, orari, contatti e discipline associate prima di decidere se approfondire.`
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Landing disciplina</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">{discipline.title}</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{discipline.description}</p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{gyms.length} schede disponibili</span>
        <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{discipline.name}</span>
        {#each cityStats.slice(0, 3) as [city, count]}
          <span class="rounded-full sc-filter-chip px-3 py-1 text-xs font-semibold">{city}: {count}</span>
        {/each}
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Panoramica della disciplina</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come leggere il catalogo di {discipline.name}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Qui compaiono solo le schede che nel database risultano legate a {discipline.name}. Il vantaggio è semplice: non stai guardando una raccolta generica, ma un sottoinsieme già filtrato.
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          Le strutture pubblicate in questa pagina coprono soprattutto queste aree: <strong>{exampleAreas || 'zone già presenti nel catalogo'}</strong>.
          Aprendo una scheda completa puoi controllare impostazione tecnica, contatti, orari e praticità rispetto alla tua posizione.
        </p>
      </div>
    </section>

    {#if cityStats.length}
      <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sc-detail-section sm:p-7">
        <div class="max-w-4xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Zone piu presenti</p>
          <h2 class="mt-1 text-2xl font-bold text-slate-900">Dove trovi piu schede di {discipline.name}</h2>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each cityStats as [city, count]}
            <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 sc-detail-card">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{city}</p>
              <p class="mt-2 text-2xl font-bold text-slate-900">{count}</p>
              <p class="mt-1 text-sm font-semibold text-slate-600">{count === 1 ? 'scheda collegata' : 'schede collegate'}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Come usarla</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come usarla per trovare una struttura adatta</h2>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Focus</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Qui trovi solo schede che nel catalogo risultano collegate a {discipline.name}, senza dover rifare ogni volta il filtro da capo.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Confronto</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Puoi confrontare più strutture guardando indirizzo, orari e discipline associate prima di aprire il dettaglio completo.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contesto locale</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">La distribuzione delle schede ti fa capire anche in quali zone questa disciplina è oggi più rappresentata nel catalogo.</p>
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
          {@const disciplinePreview = disciplinePreviewForGym(gym, 4)}
          <article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sc-card sc-gym-card" style={`animation-delay:${i * 20}ms`}>
            <div class="relative h-44 overflow-hidden">
              <img
                src={image.src}
                alt={`Immagine ${gym.name}`}
                class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
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
                      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold sc-discipline-chip sc-discipline-chip--muted">+{disciplinePreview.remaining}</span>
                    {/if}
                  {/if}
                </div>
              </div>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Indirizzo:</strong> {[gym.address, gym.city].filter(Boolean).join(', ') || 'Indirizzo non disponibile'}</p>
              <p class="rounded-xl sc-gym-card-row px-3 py-2 text-sm text-slate-700"><strong>Orari:</strong> {gym.hours_info || 'Orari da verificare'}</p>
              <div class="flex flex-wrap gap-2 text-xs font-bold sc-card-signal-list">
                <span class={`rounded-full px-2.5 py-1 ${hasContactSignal(gym) ? 'sc-card-signal--ok' : 'sc-card-signal--muted'}`}>
                  {hasContactSignal(gym) ? 'Contatti' : 'Contatti n/d'}
                </span>
                <span class={`rounded-full px-2.5 py-1 ${gym.latitude && gym.longitude ? 'sc-card-signal--ok' : 'sc-card-signal--muted'}`}>
                  {gym.latitude && gym.longitude ? 'Mappa' : 'Mappa n/d'}
                </span>
              </div>
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




