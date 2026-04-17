<script>
  import { disciplinePreviewForGym, gymHref, imageForGym } from '$lib/gym-detail';
  import { absoluteUrl, SITE_NAME, jsonLdScript } from '$lib/site';

  export let data;

  const { location, gyms, topDisciplines } = data;
  const pageUrl = absoluteUrl(`/zone/${location.slug}`);
  const title = `${location.title} | ${SITE_NAME}`;
  const description = `${location.description} Consulta una selezione di ${gyms.length} schede pubbliche con link ai dettagli completi.`;
  const isIndexableLanding = gyms.length >= 2;
  const disciplineSummary = topDisciplines.join(', ');
  const faqItems = [
    {
      question: `Che cosa trovo nella pagina ${location.title}?`,
      answer: `La pagina raccoglie ${gyms.length} schede pubbliche collegate a ${location.name}. Serve a vedere in un colpo solo quali strutture del catalogo ricadono davvero in quest'area.`
    },
    {
      question: `Quali discipline sono più presenti a ${location.name}?`,
      answer: disciplineSummary
        ? `In questo momento le discipline che emergono di più in questa zona sono ${disciplineSummary}.`
        : `In questa zona il catalogo è ancora in crescita e la panoramica delle discipline si sta consolidando.`
    },
    {
      question: `Le schede di ${location.name} mostrano contatti e orari?`,
      answer: `Sì. Quando disponibili, le schede mostrano indirizzo, orari e riferimenti per contattare la struttura o controllare il sito ufficiale.`
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

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Panoramica della zona</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Allenarsi a {location.name}: come leggere questa raccolta</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Questa landing raccoglie schede pubbliche legate a {location.name} e alle località vicine già presenti nel catalogo. In pratica, qui vedi subito quali strutture abbiamo già mappato in quest'area.
        </p>
        <p class="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          In questo momento le discipline che emergono di più in zona sono <strong>{disciplineSummary || 'fitness e arti marziali'}</strong>.
          Se vuoi allenarti con continuità, trovare una soluzione temporanea o orientarti dopo un trasferimento, da qui puoi aprire le schede complete e controllare contatti, orari e posizione.
        </p>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-4xl">
        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">Come leggerla</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">Come usarla per scegliere meglio</h2>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Selezione</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">La pagina mette insieme solo schede già abbastanza curate, così eviti risultati troppo deboli o poco informativi.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Confronto rapido</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Puoi confrontare più strutture della stessa area guardando indirizzo, discipline e orari prima di aprire il dettaglio completo.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Ricerca locale</p>
          <p class="mt-2 text-sm leading-7 text-slate-700">Se sei in viaggio o ti sei appena trasferito, qui capisci subito quali opzioni abbiamo già censito in zona.</p>
        </div>
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
                <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 sc-gym-card-kicker">{location.name}</p>
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
        <h2 class="mt-2 text-2xl font-bold text-slate-900">FAQ sulla zona {location.name}</h2>
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




