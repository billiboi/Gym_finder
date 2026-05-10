<script>
  import { REVIEW_PRINCIPLES } from '$lib/trust';

  export let title = 'Recensioni e feedback';
  export let intro =
    'Le recensioni possono aiutare, ma la fiducia nasce anche da dati leggibili, fonti chiare e correzioni tracciate.';
</script>

<section class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur-sm sc-panel sm:p-7">
  <div class="max-w-3xl">
    <p class="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Recensioni</p>
    <h2 class="mt-2 text-3xl font-bold leading-tight text-slate-950">{title}</h2>
    <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{intro}</p>
  </div>

  <div class="mt-5 grid gap-3 md:grid-cols-3">
    {#each REVIEW_PRINCIPLES as item}
      <article class="rounded-2xl border border-slate-200 bg-white/90 p-4">
        <h3 class="text-base font-bold text-slate-950">{item.title}</h3>
        <p class="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
      </article>
    {/each}
  </div>
</section>
