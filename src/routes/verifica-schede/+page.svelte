<script>
  import TrustBadges from '$lib/components/TrustBadges.svelte';
  import { VERIFICATION_STEPS } from '$lib/trust';
  import { SITE_NAME, absoluteUrl, jsonLdScript } from '$lib/site';

  const pageUrl = absoluteUrl('/verifica-schede');
  const title = `Verifica schede palestra | ${SITE_NAME}`;
  const description =
    'Come Palestre in Zona controlla richieste, aggiornamenti, fonti e segnalazioni sulle schede palestra.';
  const faqItems = [
    {
      question: 'Una richiesta proprietario modifica subito la scheda?',
      answer: 'No. La richiesta viene registrata, verificata via email e poi controllata manualmente prima della pubblicazione.'
    },
    {
      question: 'Posso segnalare un errore anche se non gestisco la palestra?',
      answer: 'Sì. Le segnalazioni su indirizzo, chiusure, sito, telefono e orari aiutano a migliorare il catalogo.'
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
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Verifica schede</p>
      <h1 class="mt-3 max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
        Come controlliamo aggiornamenti, fonti e richieste sulle schede
      </h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-slate-600">
        La fiducia non nasce da un badge messo a caso. Nasce da un processo leggibile: chi chiede la modifica, quale dato cambia, da dove arriva l’informazione e quando viene pubblicata.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <a href="/rivendica-scheda" class="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 sc-button">Richiedi verifica</a>
        <a href="/chi-siamo" class="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-50">Chi siamo</a>
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Processo</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Il percorso di verifica</h2>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-2">
        {#each VERIFICATION_STEPS as step}
          <article class="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <h3 class="text-lg font-bold text-slate-950">{step.title}</h3>
            <p class="mt-2 text-sm leading-7 text-slate-600">{step.text}</p>
          </article>
        {/each}
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Badge e limiti</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Cosa significa fidarsi di una scheda</h2>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Una scheda può essere utile anche quando non è perfetta, se distingue bene cosa è disponibile, cosa è ufficiale e cosa va ancora confermato.
        </p>
      </div>
      <div class="mt-5">
        <TrustBadges />
      </div>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">FAQ</p>
        <h2 class="mt-2 text-3xl font-bold text-slate-950">Domande frequenti</h2>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-3">
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
