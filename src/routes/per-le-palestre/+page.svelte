<script>
  import { SITE_CONTACT_EMAIL, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';
  import { trackEvent } from '$lib/tracking';
  import TrustBadges from '$lib/components/TrustBadges.svelte';

  export let data;
  export let form;

  const pageUrl = absoluteUrl('/per-le-palestre');
  const title = `Gestisci la scheda della tua palestra | ${SITE_NAME}`;
  const description =
    'Aggiorna informazioni, contatti e orari senza obblighi pubblicitari. Le opzioni premium sono facoltative e vengono valutate solo su richiesta.';

  const plans = [
    {
      name: 'Scheda verificata',
      kicker: 'Partenza',
      price: 'Gratis',
      period: 'in fase iniziale',
      description: 'Per correggere dati essenziali e rendere la scheda affidabile.',
      features: ['Contatti e orari rivisti', 'Link ufficiali e social', 'Badge verifica dopo controllo'],
      cta: 'Verifica la scheda'
    },
    {
      name: 'Scheda premium',
      kicker: 'Visibilità',
      price: 'Su richiesta',
      period: 'dopo aver controllato scheda, zona e obiettivo',
      description: 'Per rendere la scheda più competitiva nelle ricerche locali.',
      features: ['Prezzi e descrizione curati', 'CTA più forti verso contatto', 'Priorità editoriale controllata'],
      cta: 'Richiedi premium',
      featured: true
    },
    {
      name: 'Partner locale',
      kicker: 'Crescita',
      price: 'Su progetto',
      period: 'per campagne locali',
      description: 'Per strutture che vogliono lavorare su lead e presenza territoriale.',
      features: ['Piano mensile di miglioramento', 'Analisi ricerche e scheda', 'Supporto commerciale dedicato'],
      cta: 'Parla del progetto'
    }
  ];

  $: proofItems = [
    { value: data?.catalogTotalGyms ? String(data.catalogTotalGyms) : '542', label: 'schede attive' },
    { value: data?.catalogTotalDisciplines ? String(data.catalogTotalDisciplines) : '23', label: 'discipline pubbliche canoniche' },
    { value: data?.catalogZonesAvailable ? String(data.catalogZonesAvailable) : '80+', label: 'zone disponibili' },
    { value: data?.catalogCuratedPages ? String(data.catalogCuratedPages) : '20+', label: 'pagine curate' }
  ];

  const faqItems = [
    {
      question: 'La scheda verificata è a pagamento?',
      answer:
        'No. La verifica base serve a rendere corretti i dati essenziali e a identificare un referente affidabile della struttura.'
    },
    {
      question: 'Quando ha senso passare a premium?',
      answer:
        'Quando vuoi usare la scheda per ricevere più contatti, spiegare meglio prezzi e servizi, e distinguerti nelle ricerche locali.'
    },
    {
      question: 'Le modifiche vengono pubblicate subito?',
      answer:
        'No. Le richieste passano da verifica email e controllo admin. Questo protegge il catalogo e riduce errori sui dati.'
    },
    {
      question: 'Posso partire anche se la mia palestra non è nel catalogo?',
      answer:
        'Sì. Invia i dati della struttura dal form: verranno valutati prima della pubblicazione.'
    }
  ];

  const selectedPlan = form?.values?.plan || 'Scheda premium';

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
        name: 'Soluzioni commerciali per palestre',
        url: pageUrl,
        itemListElement: plans.map((plan, index) => ({
          '@type': 'Offer',
          position: index + 1,
          name: plan.name,
          description: plan.description,
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: plan.price,
            description: plan.period
          },
          url: `${pageUrl}#lead`
        }))
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
  });

  function trackPartnerEvent(detail = {}) {
    trackEvent('partner_cta_click', detail);
  }
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
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7 lg:p-9">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Per proprietari e manager</p>
          <h1 class="mt-3 max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
            Gestisci e migliora la scheda della tua palestra
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Aggiorna informazioni, contatti e orari senza obblighi pubblicitari. Le opzioni premium sono facoltative e vengono valutate solo su richiesta.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a
              href="#lead"
              on:click={() => trackPartnerEvent({ posizione: 'hero', cta: 'richiedi_verifica' })}
              class="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button"
            >
              Richiedi contatto
            </a>
            <a
              href="#pricing"
              on:click={() => trackPartnerEvent({ posizione: 'hero', cta: 'vedi_soluzioni' })}
              class="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
            >
              Vedi soluzioni
            </a>
          </div>
        </div>

        <div class="rounded-3xl border border-emerald-900/10 bg-emerald-950 p-5 text-white shadow-xl sm:p-6">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-100">Perché funziona</p>
          <div class="mt-5 grid gap-3">
            {#each proofItems as item}
              <div class="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p class="text-3xl font-bold leading-none">{item.value}</p>
                <p class="mt-2 text-sm leading-6 text-emerald-50">{item.label}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Pricing</p>
          <h2 class="mt-2 text-3xl font-bold text-slate-950">Scegli il livello giusto per la tua palestra</h2>
        </div>
        <p class="max-w-sm text-sm leading-7 text-slate-600">Prima di proporre un’opzione premium controlliamo la scheda, la zona e l’obiettivo, così evitiamo promesse generiche.</p>
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-3">
        {#each plans as plan}
          <article class={`flex h-full flex-col rounded-3xl border p-5 ${plan.featured ? 'border-emerald-700 bg-emerald-950 text-white shadow-xl' : 'border-slate-200 bg-white/92 text-slate-950'}`}>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class={`text-xs font-bold uppercase tracking-[0.2em] ${plan.featured ? 'text-emerald-100' : 'text-emerald-800'}`}>{plan.kicker}</p>
                <h3 class="mt-2 text-2xl font-bold">{plan.name}</h3>
              </div>
              {#if plan.featured}
                <span class="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-950">Consigliata</span>
              {/if}
            </div>
            <p class={`mt-4 text-sm leading-7 ${plan.featured ? 'text-emerald-50' : 'text-slate-600'}`}>{plan.description}</p>
            <div class="mt-5">
              <p class="text-3xl font-bold">{plan.price}</p>
              <p class={`mt-1 text-sm ${plan.featured ? 'text-emerald-100' : 'text-slate-500'}`}>{plan.period}</p>
            </div>
            <ul class="mt-5 grid gap-2 text-sm leading-6">
              {#each plan.features as feature}
                <li class="flex items-start gap-2">
                  <span class={`mt-2 h-1.5 w-1.5 rounded-full ${plan.featured ? 'bg-emerald-200' : 'bg-emerald-700'}`}></span>
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>
            <a
              href="#lead"
              on:click={() => trackPartnerEvent({ posizione: 'piano', piano: plan.name, cta: plan.cta })}
              class={`mt-6 inline-flex min-h-[2.9rem] items-center justify-center rounded-xl px-4 text-sm font-bold transition ${plan.featured ? 'bg-white text-emerald-950 hover:bg-emerald-50' : 'border border-slate-200 bg-white text-slate-950 hover:bg-slate-50'}`}
            >
              {plan.cta}
            </a>
          </article>
        {/each}
      </div>
    </section>

    <section class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
      <div class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Proof</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Cosa migliora quando la scheda è curata</h2>
        <div class="mt-5 grid gap-3">
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p class="text-sm font-bold text-slate-950">Meno attrito prima del contatto</p>
            <p class="mt-2 text-sm leading-7 text-slate-600">Orari, indirizzo, telefono, sito e prezzo aiutano l'utente a decidere senza cercare altrove.</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p class="text-sm font-bold text-slate-950">Più fiducia nella struttura</p>
            <p class="mt-2 text-sm leading-7 text-slate-600">Una scheda verificata comunica che la palestra è seguita da un referente reale.</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p class="text-sm font-bold text-slate-950">Più contesto SEO locale</p>
            <p class="mt-2 text-sm leading-7 text-slate-600">Zone, discipline e schede si collegano tra loro per intercettare ricerche locali più specifiche.</p>
          </div>
        </div>
      </div>

      <section id="lead" class="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Lead form</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Parliamo della tua scheda</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600">Rispondiamo a {SITE_CONTACT_EMAIL}. Il lead viene salvato come richiesta commerciale e passa da verifica.</p>

        {#if form?.success}
          <div class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p class="text-sm font-bold text-emerald-950">Richiesta ricevuta</p>
            <p class="mt-2 text-sm leading-7 text-slate-700">ID: <strong>{form.requestId}</strong>. Controlla l'email per il link di verifica.</p>
          </div>
        {:else if form?.error}
          <div class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p class="text-sm font-bold text-red-900">Invio non riuscito</p>
            <p class="mt-2 text-sm leading-7 text-slate-700">{form.error}</p>
          </div>
        {/if}

        <form method="POST" action="?/lead" class="mt-5 grid gap-4" on:submit={() => trackPartnerEvent({ posizione: 'form', piano: selectedPlan, cta: 'submit_lead' })}>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
              <input name="gym_name" value={form?.values?.gym_name || ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" required />
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">Piano</span>
              <select name="plan" class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2">
                {#each plans as plan}
                  <option value={plan.name} selected={selectedPlan === plan.name}>{plan.name}</option>
                {/each}
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">Referente</span>
              <input name="requester_name" value={form?.values?.requester_name || ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" required />
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">Ruolo</span>
              <input name="requester_role" value={form?.values?.requester_role || ''} placeholder="Titolare, manager, staff" class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">Email</span>
              <input name="requester_email" type="email" value={form?.values?.requester_email || ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" required />
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">Telefono</span>
              <input name="requester_phone" value={form?.values?.requester_phone || ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
            </label>
          </div>

          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Sito o link scheda</span>
            <input name="website" value={form?.values?.website || ''} placeholder="https://..." class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Obiettivo</span>
            <textarea name="message" rows="5" class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-7 text-slate-900 outline-none ring-slate-900 transition focus:ring-2" placeholder="Esempio: voglio aggiornare prezzi, orari e rendere la scheda più efficace per chi cerca corsi nella mia zona.">{form?.values?.message || ''}</textarea>
          </label>

          <button type="submit" class="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
            Invia richiesta commerciale
          </button>
        </form>
      </section>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Trust</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Visibilità senza perdere credibilità</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Le schede migliori sono complete, verificabili e sobrie. La parte commerciale migliora la presentazione, non sostituisce i controlli sui dati.
        </p>
      </div>
      <div class="mt-5">
        <TrustBadges />
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">FAQ commerciali</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Domande prima di iniziare</h2>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-2">
        {#each faqItems as item}
          <article class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <h3 class="text-base font-bold text-slate-950">{item.question}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
          </article>
        {/each}
      </div>
    </section>
  </main>
</div>
