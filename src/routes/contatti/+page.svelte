<script>
  import { SITE_CONTACT_EMAIL, SITE_CONTACT_MAILTO, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  const pageUrl = absoluteUrl('/contatti');
  const title = `Contatti | ${SITE_NAME}`;
  const description =
    'Contatta Palestre in Zona per segnalazioni, aggiornamenti schede, richieste commerciali o collaborazioni.';
  const structuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Contatti</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Parliamone in modo semplice</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Se vuoi segnalare una scheda da correggere, proporre una collaborazione o chiedere informazioni sul progetto, puoi scrivere direttamente via email.
      </p>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Email</p>
          <a href={SITE_CONTACT_MAILTO} class="mt-2 inline-flex text-lg font-bold text-emerald-800 underline decoration-2 underline-offset-2">
            {SITE_CONTACT_EMAIL}
          </a>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Puoi usare questo indirizzo per segnalazioni, aggiornamenti dati, richieste commerciali o proposte di collaborazione.
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tempi di risposta</p>
          <p class="mt-2 text-lg font-bold text-slate-900">Risposta manuale</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Le richieste vengono gestite manualmente, quindi è meglio essere chiari su palestra, zona e tipo di modifica richiesta.
          </p>
        </div>
      </div>
    </section>
  </main>
</div>
