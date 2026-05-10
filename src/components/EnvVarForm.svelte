<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';
  import { track } from '../lib/processTracker.svelte.js';

  // scope: 'stack' | 'project'
  // mode: 'create' | 'edit'
  let {
    open = $bindable(false),
    scope = 'stack',
    mode = 'create',
    parentId,             // stackId or projectId for create
    record = null,        // existing user-data record for edit
    onChanged,
  } = $props();

  let key = $state('');
  let content = $state('');
  let sensitive = $state(false);
  let busy = $state(false);

  $effect(() => {
    if (open) {
      key = record?.key || '';
      content = record?.content || '';
      sensitive = !!record?.sensitive;
    }
  });

  async function submit() {
    if (!key.trim()) { toast.error('Key is required'); return; }
    busy = true;
    const body = { key: key.trim(), content };
    if (scope === 'project') body.sensitive = sensitive;
    try {
      let res;
      if (mode === 'edit' && record?.id) {
        res = scope === 'stack'
          ? await api.userDataUpdate(record.id, body)
          : await api.projectEnvUpdate(record.id, body);
      } else {
        res = scope === 'stack'
          ? await api.stackUserDataCreate(parentId, body)
          : await api.projectEnvCreate(parentId, body);
      }
      toast.success(`${mode === 'edit' ? 'Updated' : 'Created'} ${key}`, '');
      if (res?.id) track(res, { label: `${mode === 'edit' ? 'Update' : 'Create'} env ${key}`, onFinished: onChanged });
      else onChanged?.();
      open = false;
    } catch (e) {
      toast.apiError(`${mode === 'edit' ? 'Update' : 'Create'} env failed`, e);
    } finally { busy = false; }
  }
</script>

<Modal bind:open title={`${mode === 'edit' ? 'Edit' : 'New'} env variable`}>
  <div class="space-y-3 text-sm">
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Key *</span>
      <input
        class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-slate-100 focus:border-emerald-600 focus:outline-none"
        bind:value={key}
        placeholder="MY_VAR"
        disabled={mode === 'edit'}
      />
      <span class="mt-1 block text-[11px] text-slate-500">
        Pattern: <code>[a-zA-Z_]+[a-zA-Z0-9_]*</code>. Max 8192 ASCII chars in value.
      </span>
    </label>
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Value</span>
      <textarea
        rows="5"
        class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-slate-100 focus:border-emerald-600 focus:outline-none"
        bind:value={content}
      ></textarea>
    </label>
    {#if scope === 'project'}
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={sensitive} class="accent-emerald-500" />
        <span class="text-slate-300">Sensitive (value masked in UI)</span>
      </label>
    {/if}
  </div>
  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={busy}>Cancel</Button>
    <Button size="sm" variant="primary" onclick={submit} disabled={busy || !key.trim()}>
      {busy ? 'Saving…' : (mode === 'edit' ? 'Save' : 'Create')}
    </Button>
  {/snippet}
</Modal>
