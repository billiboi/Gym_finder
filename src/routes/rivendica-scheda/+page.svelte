<script>
  import { SITE_CONTACT_EMAIL, SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  export let data;
  export let form;

  const reasonOptions = [
    {
      value: 'Aggiornamento dati',
      tag: 'Dati',
      title: 'Aggiorna i dati essenziali',
      description: 'Per correggere contatti, orari, sito, discipline o descrizione della scheda.',
      helperTitle: 'Cosa inviare',
      helperItems: ['Link o nome esatto della palestra', 'Dati da correggere', 'Testo o riferimenti aggiornati'],
      messageLabel: 'Cosa va aggiornato',
      messagePlaceholder:
        "Esempio: aggiornare telefono, sito, orari, discipline disponibili e descrizione breve della struttura.",
      submitLabel: 'Invia richiesta di aggiornamento'
    },
    {
      value: 'Correzione scheda',
      tag: 'Correzione',
      title: 'Correggi una scheda imprecisa',
      description: 'Per segnalare errori puntuali o informazioni che oggi possono creare sfiducia.',
      helperTitle: 'Cosa aiuta di più',
      helperItems: ['Indicare l’errore esatto', 'Scrivere il dato corretto', 'Spiegare perché va modificato'],
      messageLabel: 'Qual è l’errore da correggere',
      messagePlaceholder:
        "Esempio: l’indirizzo mostrato non è corretto, il sito è cambiato o la palestra non offre più una certa disciplina.",
      submitLabel: 'Invia correzione'
    },
    {
      value: 'Rivendicazione scheda',
      tag: 'Claim',
      title: 'Rivendica la scheda della struttura',
      description: 'Per farti riconoscere come referente ufficiale della palestra presente nel catalogo.',
      helperTitle: 'Preparazione consigliata',
      helperItems: ['Nome della palestra e link scheda', 'Ruolo nella struttura', 'Contatto verificabile'],
      messageLabel: 'Spiega il tuo ruolo',
      messagePlaceholder:
        'Esempio: sono il titolare o faccio parte dello staff e posso confermare le informazioni ufficiali della struttura.',
      submitLabel: 'Invia richiesta di rivendicazione'
    },
    {
      value: 'Collaborazione commerciale',
      tag: 'Business',
      title: 'Apri un contatto commerciale serio',
      description: 'Per parlare di visibilità, qualità della scheda, priorità commerciali e prossimi step.',
      helperTitle: 'Richiesta più qualificata',
      helperItems: ['Obiettivo commerciale chiaro', 'Link alla scheda già pubblica', 'Persona e ruolo decisionale'],
      messageLabel: 'Qual è l’obiettivo commerciale',
      messagePlaceholder:
        'Esempio: vogliamo migliorare la qualità della scheda, capire le opportunità di visibilità e aprire un confronto su una collaborazione.',
      submitLabel: 'Richiedi contatto commerciale'
    }
  ];

  const pageUrl = absoluteUrl('/rivendica-scheda');
  const title = `Rivendica una scheda | ${SITE_NAME}`;
  const description =
    "Richiedi l'aggiornamento o la rivendicazione di una pagina palestra con un form interno pensato per il progetto.";
  const structuredDataScript = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: pageUrl
  });

  $: currentValues = {
    gym_name: form?.values?.gym_name ?? data.prefill.gym ?? '',
    gym_url: form?.values?.gym_url ?? data.prefill.url ?? '',
    reason: form?.values?.reason ?? data.prefill.reason ?? 'Aggiornamento dati',
    requester_name: form?.values?.requester_name ?? '',
    requester_role: form?.values?.requester_role ?? '',
    requester_email: form?.values?.requester_email ?? '',
    requester_phone: form?.values?.requester_phone ?? '',
    message: form?.values?.message ?? ''
  };
  $: selectedFlow = reasonOptions.find((option) => option.value === currentValues.reason) ?? reasonOptions[0];
  $: emailSubject = currentValues.gym_name
    ? `${currentValues.reason} - ${currentValues.gym_name}`
    : currentValues.reason;
  $: emailBody = [
    'Ciao,',
    '',
    currentValues.reason === 'Collaborazione commerciale'
      ? 'vorrei aprire un contatto commerciale su Palestre in Zona.'
      : 'vorrei richiedere un aggiornamento o la rivendicazione di una scheda su Palestre in Zona.',
    '',
    `Nome palestra: ${currentValues.gym_name || '[inserisci nome palestra]'}`,
    `Link scheda: ${currentValues.gym_url || '[inserisci link scheda]'}`,
    `Motivo richiesta: ${currentValues.reason}`,
    `Richiedente: ${currentValues.requester_name || '[nome]'}`,
    `Ruolo: ${currentValues.requester_role || '[ruolo]'}`,
    `Email: ${currentValues.requester_email || '[email]'}`,
    `Telefono: ${currentValues.requester_phone || '[telefono]'}`,
    '',
    'Dettagli richiesta:',
    currentValues.message || '[descrivi qui la richiesta]',
    '',
    'Grazie.'
  ].join('\n');
  $: mailtoHref = `mailto:${SITE_CONTACT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Rivendica una scheda</p>
      <h1 class="mt-2 max-w-4xl text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">
        {selectedFlow.value === 'Collaborazione commerciale'
          ? 'Apri un contatto commerciale con una richiesta più seria e più chiara'
          : 'Aggiorna la pagina della tua palestra senza passaggi confusi'}
      </h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        {selectedFlow.value === 'Collaborazione commerciale'
          ? 'Se gestisci una struttura già presente nel catalogo, qui puoi partire nel modo giusto: obiettivo chiaro, referente chiaro e richiesta più facile da valutare lato commerciale.'
          : 'Se gestisci una struttura presente nel catalogo, usa questo form per richiedere correzioni, integrazioni o la rivendicazione della pagina pubblica.'}
      </p>
    </section>

    {#if form?.success}
      <section class="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Richiesta inviata</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Perfetto, abbiamo registrato la richiesta</h2>
        <p class="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
          ID richiesta: <strong>{form.requestId}</strong>. Tieni questo riferimento se vorrai riscriverci sulla stessa segnalazione.
        </p>
      </section>
    {:else if form?.error}
      <section class="mt-5 rounded-3xl border border-red-200 bg-red-50/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-red-700">Invio non riuscito</p>
        <p class="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{form.error}</p>
      </section>
    {/if}

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Scheda selezionata</p>
          <p class="mt-2 text-lg font-bold text-slate-900">{currentValues.gym_name || 'Nessuna scheda precompilata'}</p>
          <p class="mt-3 break-all text-sm leading-7 text-slate-600">
            {currentValues.gym_url || 'Se arrivi da una scheda pubblica, il link viene inserito automaticamente.'}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Obiettivo selezionato</p>
              <p class="mt-2 text-lg font-bold text-slate-900">{selectedFlow.title}</p>
            </div>
            <div class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              {selectedFlow.tag}
            </div>
          </div>
          <p class="mt-3 text-sm leading-7 text-slate-600">{selectedFlow.description}</p>
          <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{selectedFlow.helperTitle}</p>
            <ul class="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              {#each selectedFlow.helperItems as item}
                <li class="flex items-start gap-2">
                  <span class="mt-1 h-2 w-2 rounded-full bg-emerald-700"></span>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Invia richiesta</p>
        <h2 class="mt-2 text-2xl font-bold text-slate-900">Scegli il tipo di richiesta e compila il form</h2>
      </div>

      <form method="POST" action="?/submit" class="mt-5 grid gap-4">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {#each reasonOptions as option}
            <label class={`rounded-2xl border p-4 transition ${currentValues.reason === option.value ? 'border-emerald-500 bg-emerald-50/90 shadow-sm' : 'border-slate-200 bg-white/90 hover:border-slate-300'}`}>
              <input class="sr-only" type="radio" name="reason" value={option.value} checked={currentValues.reason === option.value} />
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class={`text-[0.7rem] font-bold uppercase tracking-[0.22em] ${currentValues.reason === option.value ? 'text-emerald-800' : 'text-slate-500'}`}>{option.tag}</p>
                  <p class="mt-2 text-base font-bold leading-6 text-slate-900">{option.title}</p>
                </div>
                <span class={`mt-1 h-3 w-3 rounded-full border ${currentValues.reason === option.value ? 'border-emerald-700 bg-emerald-700' : 'border-slate-300 bg-white'}`}></span>
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-600">{option.description}</p>
            </label>
          {/each}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
            <input name="gym_name" value={currentValues.gym_name} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Link scheda</span>
            <input name="gym_url" value={currentValues.gym_url} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Nome e cognome</span>
            <input name="requester_name" value={currentValues.requester_name} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Ruolo</span>
            <input name="requester_role" value={currentValues.requester_role} placeholder="Titolare, coach, staff..." class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Email</span>
            <input name="requester_email" type="email" value={currentValues.requester_email} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-slate-700">Telefono</span>
            <input name="requester_phone" value={currentValues.requester_phone} class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2" />
          </label>
        </div>

        <label class="grid gap-2">
          <span class="text-sm font-semibold text-slate-700">{selectedFlow.messageLabel}</span>
          <textarea
            name="message"
            rows="7"
            placeholder={selectedFlow.messagePlaceholder}
            class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-7 text-slate-900 outline-none ring-slate-900 transition focus:ring-2"
          >{currentValues.message}</textarea>
        </label>

        <div class="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Cosa succede dopo</p>
            <p class="mt-2 text-sm leading-7 text-slate-700">
              {#if data.persistentClaimFlow}
                La richiesta viene salvata dal sito e possiamo ripartire da un riferimento chiaro invece di perderci tra messaggi vaghi.
              {:else}
                Se il salvataggio diretto non è disponibile, puoi comunque usare l’email precompilata senza perdere i dettagli già inseriti.
              {/if}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="submit" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">
              {selectedFlow.submitLabel}
            </button>
            <a href={mailtoHref} class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
              Apri email precompilata
            </a>
          </div>
        </div>
      </form>
    </section>
  </main>
</div>
