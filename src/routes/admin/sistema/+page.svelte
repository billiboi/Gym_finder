<script>
  export let data;
</script>

<main class="mx-auto min-h-screen w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Sistema</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Stato ambiente, log delle operazioni e backup dei dati.
        </p>
      </div>
      <a href="/admin" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Dashboard admin</a>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Schede (public.gyms)</p>
        <p class="mt-2"><strong>Persistenza:</strong> {data.gymStore.persistence}</p>
        <p class="mt-1"><strong>Lettura Supabase:</strong> {data.gymStore.hasSupabaseRead ? 'attiva' : 'non disponibile'}</p>
        <p class="mt-1"><strong>Scrittura Supabase:</strong> {data.gymStore.hasSupabaseWrite ? 'attiva' : 'non disponibile'}</p>
        <p class="mt-1"><strong>Tabella:</strong> {data.gymStore.table}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Candidati (gym_candidates)</p>
        <p class="mt-2"><strong>Supabase configurato:</strong> {data.candidatesStore.hasSupabase ? 'sì' : 'no'}</p>
        <p class="mt-1"><strong>Tabella:</strong> {data.candidatesStore.table}</p>
      </div>
    </div>
  </section>

  <section class="mt-5 grid gap-3 sm:grid-cols-2">
    <a href="/admin/audit" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <p class="text-lg font-bold text-slate-900">Log operazioni</p>
      <p class="mt-1 text-sm text-slate-600">Cronologia delle modifiche fatte da admin: cosa è cambiato, quando, su quale scheda.</p>
    </a>
    <a href="/admin/export/gyms.csv" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <p class="text-lg font-bold text-slate-900">Esporta backup CSV</p>
      <p class="mt-1 text-sm text-slate-600">Scarica l'intero catalogo schede in formato CSV.</p>
    </a>
  </section>
</main>
