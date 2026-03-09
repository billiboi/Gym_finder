<script>
  export let data;
  export let form;

  $: gym = data.gym;
  $: saved = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('saved') === '1';
</script>

<main class="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <section class="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm sm:p-7">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Area Admin</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Modifica scheda palestra</h1>
      </div>
      <a href="/admin" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Torna elenco</a>
    </div>

    {#if saved}
      <p class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Modifiche salvate con successo.
      </p>
    {/if}

    {#if form?.error}
      <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {form.error}
      </p>
    {/if}

    <form method="POST" class="mt-5 grid gap-3">
      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Nome palestra</span>
        <input name="name" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.name} required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Discipline (separate da |)</span>
        <input name="discipline" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.discipline_text} />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Indirizzo</span>
        <input name="address" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.address} required />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Città/Località</span>
        <input name="city" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.city} />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Telefono</span>
        <input name="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.phone} />
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Orari di apertura</span>
        <textarea name="hours_info" rows="4" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">{gym.hours_info}</textarea>
      </label>

      <label class="grid gap-1">
        <span class="text-sm font-semibold text-slate-700">Sito web</span>
        <input name="website" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.website} />
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Latitudine</span>
          <input name="latitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.latitude ?? ''} />
        </label>
        <label class="grid gap-1">
          <span class="text-sm font-semibold text-slate-700">Longitudine</span>
          <input name="longitude" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={gym.longitude ?? ''} />
        </label>
      </div>

      <button type="submit" class="mt-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Salva modifiche
      </button>
    </form>
  </section>
</main>