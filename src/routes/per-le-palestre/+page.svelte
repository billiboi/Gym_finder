<script>
  import { SITE_CONTACT_EMAIL, SITE_CONTACT_MAILTO, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  const pageUrl = absoluteUrl('/per-le-palestre');
  const title = `Per le palestre | ${SITE_NAME}`;
  const description =
    'Pagina dedicata alle palestre che vogliono segnalare correzioni, aggiornare la propria scheda o proporre collaborazioni.';
  const structuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: pageUrl
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
  <main class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Per le palestre</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Vuoi aggiornare o migliorare la tua scheda?</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Se gestisci una struttura presente nel catalogo, puoi richiedere correzioni, aggiornamenti o segnalarci informazioni mancanti.
      </p>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">1. Identifica la scheda</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Invia il nome della palestra e, se possibile, il link esatto della pagina pubblica da correggere.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">2. Spiega la modifica</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Indica in modo chiaro cosa va aggiornato: discipline, indirizzo, orari, telefono, sito o descrizione.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">3. Invia tutto via email</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Per richieste manuali o collaborazioni puoi usare il percorso guidato oppure scrivere direttamente all'indirizzo del progetto.</p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Contatto diretto</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Invia la richiesta</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Scrivi a <strong>{SITE_CONTACT_EMAIL}</strong> includendo nome palestra, link scheda e aggiornamenti richiesti.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <a href="/rivendica-scheda?reason=Rivendicazione%20scheda" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
            Avvia richiesta guidata
          </a>
          <a href={SITE_CONTACT_MAILTO} class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
            Scrivi via email
          </a>
        </div>
      </div>
    </section>
  </main>
</div>
