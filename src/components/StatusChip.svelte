<script>
  import { statusFromProcess, statusLabel, statusKind } from '../lib/format.js';

  // Pass either { entity } (process/notification object) OR { status } string.
  let { entity = null, status = null, size = 'sm' } = $props();

  const kind = $derived(entity ? statusFromProcess(entity) : statusKind(status));
  const label = $derived(entity ? statusLabel(entity) : (status || '—'));

  function classes(k) {
    const base = size === 'xs'
      ? 'rounded-full border px-1.5 py-0 text-[10px] uppercase tracking-wide'
      : 'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide';
    if (k === 'finished') return `${base} border-emerald-700 bg-emerald-950/40 text-emerald-300`;
    if (k === 'failed') return `${base} border-rose-700 bg-rose-950/40 text-rose-300`;
    if (k === 'canceled') return `${base} border-amber-700 bg-amber-950/40 text-amber-300`;
    if (k === 'running') return `${base} border-sky-700 bg-sky-950/40 text-sky-300 animate-pulse`;
    if (k === 'waiting') return `${base} border-slate-600 bg-slate-800/60 text-slate-300`;
    return `${base} border-slate-700 bg-slate-950/40 text-slate-300`;
  }
</script>

<span class={classes(kind)}>{label}</span>
