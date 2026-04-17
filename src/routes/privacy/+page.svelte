<script>
  import { SITE_NAME, absoluteUrl } from '$lib/site';

  const pageUrl = absoluteUrl('/privacy');
  const title = `Privacy | ${SITE_NAME}`;
  const description =
    'Informativa privacy essenziale di Palestre in Zona per utenti, visitatori e segnalazioni inviate al progetto.';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={pageUrl} />
</svelte:head>

<div class="min-h-screen w-full sc-page">
  <main class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
    <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sc-panel sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Privacy</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-5xl">Informativa essenziale</h1>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Palestre in Zona è un progetto editoriale e informativo. Questa pagina descrive in modo semplice quali dati possono essere trattati durante l'uso del sito.
      </p>
    </section>

    <section class="mt-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
      <div class="grid gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h2 class="text-lg font-bold text-slate-900">Dati di navigazione</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Il sito può trattare dati tecnici minimi necessari al funzionamento, come richieste HTTP, log e informazioni di navigazione fornite dalla piattaforma di hosting.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h2 class="text-lg font-bold text-slate-900">Dati inviati volontariamente</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Se scrivi via email per segnalazioni o richieste, i dati che invii vengono usati solo per gestire quella comunicazione e le eventuali modifiche richieste.
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h2 class="text-lg font-bold text-slate-900">Finalità del trattamento</h2>
          <p class="mt-3 text-sm leading-7 text-slate-600">
            Le informazioni raccolte servono a mantenere il sito funzionante, migliorare il catalogo e rispondere a richieste di aggiornamento o contatto legate al progetto.
          </p>
        </div>
      </div>
    </section>
  </main>
</div>
