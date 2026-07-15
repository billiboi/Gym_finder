<script>
  import Logo from '$lib/components/Logo.svelte';
  import TrustBadges from '$lib/components/TrustBadges.svelte';
  import { BRAND_PROOF_ITEMS } from '$lib/trust';
  import { SITE_CONTACT_EMAIL, SITE_CONTACT_MAILTO, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  export let data;

  $: proofItems = BRAND_PROOF_ITEMS.map((item) => {
    if (item.key === 'catalog_total') {
      return { ...item, value: data?.catalogTotalGyms ? String(data.catalogTotalGyms) : item.value };
    }
    if (item.key === 'discipline_total') {
      return { ...item, value: data?.catalogTotalDisciplines ? String(data.catalogTotalDisciplines) : item.value };
    }
    if (item.key === 'zone_total') {
      return { ...item, value: data?.catalogZonesAvailable ? String(data.catalogZonesAvailable) : item.value };
    }
    if (item.key === 'curated_pages') {
      return { ...item, value: data?.catalogCuratedPages ? String(data.catalogCuratedPages) : item.value };
    }
    return item;
  });

  const pageUrl = absoluteUrl('/chi-siamo');
  const title = `Chi siamo | ${SITE_NAME}`;
  const description =
    'Scopri metodo, principi editoriali e controlli di Palestre in Zona, la directory locale per confrontare palestre e discipline.';
  const structuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    description,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: absoluteUrl('/')
    }
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content="index,follow" />
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
  <main class="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-hero sm:p-7 lg:p-9">
      <Logo variant="light" />
      <div class="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Chi siamo</p>
          <h1 class="mt-3 max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
            Una directory locale pensata per scegliere una palestra con meno attrito
          </h1>
          <p class="mt-4 max-w-3xl text-base leading-8 sc-hero-lede">
            Palestre in Zona organizza schede, discipline, zone, contatti e orari in un percorso semplice. Il punto non è fare rumore: è aiutare persone e strutture a incontrarsi con informazioni più chiare.
          </p>
        </div>
        <div class="grid gap-3 rounded-3xl bg-emerald-950 p-4 text-white">
          {#each proofItems as item}
            <div class="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p class="text-3xl font-black leading-none">{item.value}</p>
              <p class="mt-2 text-sm font-semibold leading-6 text-emerald-50">{item.label}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Metodo</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Cosa facciamo, in pratica</h2>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <article class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h3 class="text-base font-bold text-slate-950">Rendiamo confrontabili le schede</h3>
          <p class="mt-2 text-sm leading-7 text-slate-600">Nome, indirizzo, discipline, contatti, orari e mappa devono essere facili da leggere anche da telefono.</p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h3 class="text-base font-bold text-slate-950">Colleghiamo ricerca e contesto</h3>
          <p class="mt-2 text-sm leading-7 text-slate-600">Zone, discipline, guide e schede lavorano insieme per evitare pagine isolate e poco utili.</p>
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h3 class="text-base font-bold text-slate-950">Separiamo dati e promozione</h3>
          <p class="mt-2 text-sm leading-7 text-slate-600">Una palestra può chiedere una scheda migliore, ma le correzioni ai dati restano soggette a controllo.</p>
        </article>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Trust badges</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">I principi che guidano il catalogo</h2>
      </div>
      <div class="mt-5">
        <TrustBadges />
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Contatto</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-950">Segnala un errore o una scheda da aggiornare</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600">Le segnalazioni precise migliorano il catalogo più di qualsiasi claim generico.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <a href="/verifica-schede" class="inline-flex min-h-[2.85rem] items-center justify-center px-4 text-sm font-bold text-white transition sc-button">Come verifichiamo</a>
          <a href={SITE_CONTACT_MAILTO} class="inline-flex min-h-[2.85rem] items-center justify-center px-4 text-sm font-bold transition sc-button sc-button--secondary">{SITE_CONTACT_EMAIL}</a>
        </div>
      </div>
    </section>
  </main>
</div>
