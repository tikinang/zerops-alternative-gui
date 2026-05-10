<script>
  import { toasts, dismiss } from '../lib/toasts.svelte.js';

  function colorFor(kind) {
    if (kind === 'success') return 'border-emerald-700 bg-emerald-950/80 text-emerald-100';
    if (kind === 'error') return 'border-rose-700 bg-rose-950/80 text-rose-100';
    if (kind === 'warning') return 'border-amber-700 bg-amber-950/80 text-amber-100';
    return 'border-slate-700 bg-slate-900/90 text-slate-100';
  }
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2">
  {#each toasts.items as t (t.id)}
    <div class="pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur {colorFor(t.kind)}">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <div class="font-semibold">{t.title}</div>
          {#if t.body}
            <div class="mt-1 text-xs opacity-80 break-words">{t.body}</div>
          {/if}
        </div>
        <button
          class="text-xs opacity-60 hover:opacity-100"
          onclick={() => dismiss(t.id)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  {/each}
</div>
