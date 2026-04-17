<script>
  export let data;
  export let form;
</script>

<main class="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
  <section class="mx-auto w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
    <p class="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Area Admin</p>
    <h1 class="mt-3 text-3xl font-bold text-slate-900">Accesso riservato</h1>
    <p class="mt-3 text-sm leading-6 text-slate-600">
      Da qui entriamo nel pannello admin senza esporre le azioni di modifica al pubblico.
    </p>

    {#if !data.configured || data.setup}
      <div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        L'accesso admin non è ancora configurato. Aggiungi in locale e in Vercel queste variabili:
        <strong>ADMIN_USERNAME</strong> e <strong>ADMIN_PASSWORD</strong>.
      </div>
    {/if}

    {#if form?.error}
      <div class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {form.error}
      </div>
    {/if}

    <form method="POST" class="mt-6 space-y-4">
      <input type="hidden" name="next" value={form?.next || data.next} />

      <label class="block">
        <span class="mb-1.5 block text-sm font-semibold text-slate-700">Username</span>
        <input
          name="username"
          type="text"
          autocomplete="username"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2"
          value={form?.username || ''}
          required
        />
      </label>

      <label class="block">
        <span class="mb-1.5 block text-sm font-semibold text-slate-700">Password</span>
        <input
          name="password"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-slate-900 transition focus:ring-2"
          required
        />
      </label>

      <button
        type="submit"
        class="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        disabled={!data.configured}
      >
        Entra nel pannello admin
      </button>
    </form>

    <div class="mt-5 text-sm text-slate-500">
      <a href="/" class="font-semibold text-slate-700 underline-offset-4 hover:underline">Torna al sito pubblico</a>
    </div>
  </section>
</main>
