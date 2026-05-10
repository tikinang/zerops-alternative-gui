<script>
  let { open = $bindable(false), title = '', children, footer } = $props();

  function close() { open = false; }
  function onkeydown(e) { if (e.key === 'Escape') close(); }
</script>

<svelte:window {onkeydown} />

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onclick={close}>
    <div
      class="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 shadow-xl"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      {#if title}
        <div class="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 class="text-base font-semibold text-slate-100">{title}</h2>
          <button class="text-slate-400 hover:text-slate-200" onclick={close} aria-label="Close">×</button>
        </div>
      {/if}
      <div class="px-5 py-4 text-sm text-slate-200">
        {@render children?.()}
      </div>
      {#if footer}
        <div class="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
