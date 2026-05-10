<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  let {
    open = $bindable(false),
    title = 'Confirm',
    body = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onConfirm,
    blastRadius = '',
  } = $props();

  let busy = $state(false);

  async function handleConfirm() {
    if (!onConfirm) { open = false; return; }
    busy = true;
    try { await onConfirm(); }
    finally { busy = false; open = false; }
  }
</script>

<Modal bind:open {title}>
  <div class="space-y-3 text-sm text-slate-200">
    {#if body}<p>{body}</p>{/if}
    {#if blastRadius}
      <div class="rounded border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200">
        <div class="font-semibold uppercase tracking-widest">Impact</div>
        <p class="mt-1">{blastRadius}</p>
      </div>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="ghost" size="sm" onclick={() => (open = false)} disabled={busy}>{cancelLabel}</Button>
    <Button variant={danger ? 'danger' : 'primary'} size="sm" onclick={handleConfirm} disabled={busy}>
      {busy ? 'Working…' : confirmLabel}
    </Button>
  {/snippet}
</Modal>
