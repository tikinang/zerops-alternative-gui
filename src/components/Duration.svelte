<script>
  import { fmtDuration, processDurationMs, isInflight } from '../lib/format.js';

  let { entity, prefix = '' } = $props();

  let now = $state(Date.now());

  $effect(() => {
    if (!entity) return;
    if (!isInflight(entity)) return;
    const id = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(id);
  });

  const ms = $derived(processDurationMs(entity, now));
  const live = $derived(entity && isInflight(entity));
</script>

<span class="tabular-nums {live ? 'text-sky-300' : 'text-slate-300'}">
  {prefix}{fmtDuration(ms)}{live ? '…' : ''}
</span>
