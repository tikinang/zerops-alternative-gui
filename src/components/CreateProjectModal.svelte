<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';
  import { userStore, loadUser } from '../lib/userStore.svelte.js';

  let { open = $bindable(false), clientId, onCreated } = $props();

  // Make sure we have the user's id available — needed for the userRoles
  // entry that names the creator as OWNER. Cheap if already cached.
  $effect(() => { if (open) loadUser().catch(() => {}); });

  let name = $state('');
  let description = $state('');
  let mode = $state('LIGHT');
  let tagsInput = $state('');
  let publicIpV4Shared = $state(false);
  let envIsolation = $state('none');
  let busy = $state(false);

  function reset() {
    name = ''; description = ''; mode = 'LIGHT'; tagsInput = '';
    publicIpV4Shared = false; envIsolation = 'none';
  }

  async function submit() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    busy = true;
    const userId = userStore.data?.id;
    if (!userId) {
      toast.error('Create project failed', 'User not loaded yet — try again in a moment.');
      busy = false;
      return;
    }
    const body = {
      name: name.trim(),
      mode,
      tagList: tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
      // The creator MUST own the project — without this the API creates a
      // project the requester can't see.
      userRoles: [{ id: userId, roleCode: 'OWNER' }],
      envIsolation,
      publicIpV4Shared,
    };
    if (description.trim()) body.description = description.trim();
    try {
      const project = await api.projectCreate(clientId, body);
      toast.success('Project created', project?.name || '');
      reset();
      open = false;
      onCreated?.(project);
    } catch (e) {
      toast.apiError('Create project failed', e);
    } finally { busy = false; }
  }
</script>

<Modal bind:open title="New project">
  <div class="space-y-3 text-sm">
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Name *</span>
      <input class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" bind:value={name} placeholder="my-project" />
    </label>
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Description</span>
      <textarea rows="2" class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" bind:value={description}></textarea>
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">Mode</span>
        <select class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" bind:value={mode}>
          <option value="LIGHT">LIGHT</option>
          <option value="SERIOUS">SERIOUS</option>
        </select>
      </label>
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">Env isolation</span>
        <select class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" bind:value={envIsolation}>
          <option value="none">none</option>
          <option value="service">service</option>
        </select>
      </label>
    </div>
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Tags (comma-separated)</span>
      <input class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" bind:value={tagsInput} placeholder="prod, web" />
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={publicIpV4Shared} class="accent-emerald-500" />
      <span class="text-slate-300">Use shared public IPv4</span>
    </label>
  </div>

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={busy}>Cancel</Button>
    <Button size="sm" variant="primary" onclick={submit} disabled={busy || !name.trim()}>
      {busy ? 'Creating…' : 'Create project'}
    </Button>
  {/snippet}
</Modal>
