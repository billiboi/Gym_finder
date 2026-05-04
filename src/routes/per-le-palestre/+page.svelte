<script>
  import { SITE_CONTACT_EMAIL, SITE_CONTACT_MAILTO, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  const pageUrl = absoluteUrl('/per-le-palestre');
  const title = `Per le palestre | ${SITE_NAME}`;
  const description =
    'Aggiorna, rivendica o potenzia la scheda della tua palestra su Palestre in Zona con un percorso pensato per contatti locali qualificati.';
  const premiumPlans = [
    {
      name: 'Scheda verificata',
      tag: 'Base',
      description: 'Dati corretti, referente riconoscibile e contenuti essenziali ordinati.',
      items: ['Revisione contatti e orari', 'Descrizione più chiara', 'Link ufficiali e social'],
      href: '/rivendica-scheda?reason=Rivendicazione%20scheda'
    },
    {
      name: 'Scheda premium',
      tag: 'Visibilità',
      description: 'Scheda più competitiva per chi confronta palestre nella stessa zona.',
      items: ['Sezione prezzi quando disponibili', 'Contenuti editoriali migliori', 'Percorsi rapidi verso contatto'],
      href: '/rivendica-scheda?reason=Collaborazione%20commerciale&plan=premium'
    },
    {
      name: 'Partner locale',
      tag: 'Crescita',
      description: 'Percorso commerciale per campagne locali, priorità e miglioramento continuo.',
      items: ['Analisi della scheda', 'Priorità commerciali', 'Piano di miglioramento mensile'],
      href: '/rivendica-scheda?reason=Collaborazione%20commerciale&plan=partner'
    }
  ];
  const structuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: title,
        description,
        url: pageUrl
      },
      {
        '@type': 'OfferCatalog',
        name: 'Soluzioni per palestre',
        url: pageUrl,
        itemListElement: premiumPlans.map((plan, index) => ({
          '@type': 'Offer',
          position: index + 1,
          name: plan.name,
          description: plan.description,
          url: absoluteUrl(plan.href)
        }))
      }
    ]
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Per le palestre</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Vuoi usare la tua scheda come leva commerciale, non solo come presenza passiva?</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Se gestisci una struttura presente nel catalogo, puoi partire da aggiornamenti, rivendicazione scheda e prime richieste commerciali per rendere la tua presenza pi&ugrave; chiara, affidabile e utile a chi ti cerca.
      </p>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">1. Correggi i dati che contano</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Orari, contatti, sito, discipline e testo della scheda sono il primo livello minimo per non perdere fiducia.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">2. Renditi pi&ugrave; confrontabile</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Una scheda pi&ugrave; completa aiuta chi sta valutando diverse palestre e vuole decidere in fretta.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">3. Apri un contatto commerciale</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Se vuoi andare oltre il semplice aggiornamento, puoi usare lo stesso flusso per aprire una collaborazione.</p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Sistema premium</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Tre livelli per trasformare una scheda in un canale commerciale</h2>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        {#each premiumPlans as plan}
          <article class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">{plan.tag}</p>
              <h3 class="mt-2 text-xl font-bold text-slate-900">{plan.name}</h3>
              <p class="mt-3 text-sm leading-7 text-slate-600">{plan.description}</p>
            </div>
            <ul class="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
              {#each plan.items as item}
                <li class="flex items-start gap-2">
                  <span class="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-700"></span>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
            <a href={plan.href} class="mt-5 inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-50">
              Richiedi informazioni
            </a>
          </article>
        {/each}
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Percorso operativo</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Come iniziare senza attrito</h2>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">1. Identifica la scheda</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Invia il nome della palestra e, se possibile, il link esatto della pagina pubblica da correggere.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">2. Spiega l'obiettivo</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Indica se vuoi correggere dati, rivendicare la scheda o valutare un percorso premium.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">3. Apri il canale giusto</p>
          <p class="mt-3 text-sm leading-7 text-slate-600">Il form raccoglie le richieste in modo ordinato e lascia traccia del contesto commerciale.</p>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Contatto diretto</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Scegli il percorso pi&ugrave; adatto</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Scrivi a <strong>{SITE_CONTACT_EMAIL}</strong> includendo nome palestra, link scheda e obiettivo della richiesta.
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <a href="/rivendica-scheda?reason=Rivendicazione%20scheda" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
              Avvia richiesta guidata
            </a>
            <a href="/rivendica-scheda?reason=Collaborazione%20commerciale" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
              Richiedi contatto commerciale
            </a>
            <a href={SITE_CONTACT_MAILTO} class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
              Scrivi via email
            </a>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white/90 p-5">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Richieste adatte a questa fase</p>
          <div class="mt-4 grid gap-3">
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p class="text-sm font-bold text-slate-900">Aggiornamento dati</p>
              <p class="mt-1 text-sm leading-6 text-slate-600">Per correggere o completare una scheda gi&agrave; pubblica.</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p class="text-sm font-bold text-slate-900">Rivendicazione scheda</p>
              <p class="mt-1 text-sm leading-6 text-slate-600">Per farti riconoscere come referente della struttura.</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p class="text-sm font-bold text-slate-900">Collaborazione commerciale</p>
              <p class="mt-1 text-sm leading-6 text-slate-600">Per parlare di visibilit&agrave;, qualit&agrave; della scheda e sviluppo del canale.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>
