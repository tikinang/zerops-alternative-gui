<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';

  // mode: 'create' | 'edit'
  let {
    open = $bindable(false),
    mode = 'create',
    projectId,
    record = null,
    stacks = [],   // [{id, name, type, ports}] — to populate the location dropdown
    onChanged,
  } = $props();

  let domains = $state('');
  let sslEnabled = $state(true);
  let cdnEnabled = $state(false);
  let locations = $state([{ path: '/', port: 80, serviceStackId: '' }]);
  let busy = $state(false);

  $effect(() => {
    if (open) {
      domains = (record?.domains || []).map((d) => d.domainName || d).join(', ');
      sslEnabled = record?.sslEnabled ?? true;
      cdnEnabled = record?.cdnEnabled ?? false;
      const locs = (record?.locations || []).map((l) => ({
        path: l.path || '/',
        port: l.port || 80,
        serviceStackId: l.serviceStackId || '',
      }));
      locations = locs.length ? locs : [{ path: '/', port: stacks[0]?.ports?.[0]?.port || 80, serviceStackId: stacks[0]?.id || '' }];
    }
  });

  function addLocation() {
    locations = [...locations, { path: '/', port: 80, serviceStackId: stacks[0]?.id || '' }];
  }
  function removeLocation(i) {
    locations = locations.filter((_, idx) => idx !== i);
  }

  async function submit() {
    const dList = domains.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!dList.length) { toast.error('At least one domain'); return; }
    if (!locations.length) { toast.error('At least one location'); return; }
    if (locations.some((l) => !l.serviceStackId)) {
      toast.error('Pick a target stack for each location');
      return;
    }
    busy = true;
    const body = {
      sslEnabled,
      cdnEnabled,
      domains: dList,
      locations: locations.map((l) => ({
        path: l.path || '/',
        port: Number(l.port) || 80,
        serviceStackId: l.serviceStackId,
      })),
    };
    try {
      if (mode === 'edit' && record?.id) {
        await api.httpRoutingUpdate(record.id, body);
        toast.success('Routing updated');
      } else {
        await api.projectHttpRoutingCreate(projectId, body);
        toast.success('Routing created');
      }
      open = false;
      onChanged?.();
    } catch (e) {
      toast.apiError(`${mode === 'edit' ? 'Update' : 'Create'} routing failed`, e);
    } finally { busy = false; }
  }
</script>

<Modal bind:open title={`${mode === 'edit' ? 'Edit' : 'New'} HTTP routing`}>
  <div class="space-y-3 text-sm">
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Domains (comma or space separated)</span>
      <input
        class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none"
        bind:value={domains}
        placeholder="example.com www.example.com"
      />
    </label>
    <div class="flex items-center gap-4 text-sm">
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={sslEnabled} class="accent-emerald-500" />
        <span class="text-slate-300">SSL (Let's Encrypt)</span>
      </label>
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={cdnEnabled} class="accent-emerald-500" />
        <span class="text-slate-300">CDN</span>
      </label>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs uppercase tracking-widest text-slate-500">Locations</span>
        <button class="text-xs text-emerald-400 hover:underline" onclick={addLocation}>+ Add location</button>
      </div>
      <ul class="space-y-2">
        {#each locations as loc, i (i)}
          <li class="grid grid-cols-[1fr_80px_1fr_auto] items-center gap-2">
            <input
              class="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-600 focus:outline-none"
              bind:value={loc.path}
              placeholder="/"
            />
            <input
              type="number"
              class="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-600 focus:outline-none"
              bind:value={loc.port}
              placeholder="80"
            />
            <select
              class="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-600 focus:outline-none"
              bind:value={loc.serviceStackId}
            >
              <option value="">— pick stack —</option>
              {#each stacks as s}
                <option value={s.id}>{s.name}</option>
              {/each}
            </select>
            <button class="text-xs text-rose-400 hover:underline" onclick={() => removeLocation(i)} disabled={locations.length === 1}>×</button>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={busy}>Cancel</Button>
    <Button size="sm" variant="primary" onclick={submit} disabled={busy || !domains.trim()}>
      {busy ? 'Saving…' : (mode === 'edit' ? 'Save' : 'Create')}
    </Button>
  {/snippet}
</Modal>
