<script>
  export let compact = false;
</script>

<span class="inline-flex min-w-0 items-center gap-3">
  <span class="sc-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-950 text-sm font-black text-white">
    PZ
  </span>
  {#if !compact}
    <span class="min-w-0">
      <span class="block text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-800 sm:text-xs">Palestre in Zona</span>
      <span class="block text-xs font-semibold leading-5 text-slate-500">Directory locale verificabile</span>
    </span>
  {/if}
</span>
