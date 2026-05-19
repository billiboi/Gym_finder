<script>
  import { TRUST_BADGES } from '$lib/trust';

  export let items = TRUST_BADGES;
  export let dense = false;
</script>

<div class={`grid gap-3 ${dense ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
  {#each items as item}
    <article class="rounded-2xl border border-emerald-900/10 bg-white/90 p-4 sc-trust-badge">
      <div class="flex items-start gap-3">
        <span class="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-black text-emerald-900" aria-hidden="true">✓</span>
        <span class="sr-only">Elemento di fiducia:</span>
        <div>
          <h3 class="text-sm font-bold leading-5 text-slate-950">{item.title}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
        </div>
      </div>
    </article>
  {/each}
</div>
