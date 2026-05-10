<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';

  let { open = $bindable(false), projectId, onCreated } = $props();

  const TEMPLATES = {
    'PostgreSQL 16': `services:\n  - hostname: db\n    type: postgresql@16\n    mode: NON_HA\n`,
    'Valkey 8': `services:\n  - hostname: cache\n    type: valkey@8\n    mode: NON_HA\n`,
    'Node.js 22 (dev)': `services:\n  - hostname: api\n    type: nodejs@22\n    mode: NON_HA\n    enableSubdomainAccess: true\n    minContainers: 1\n    envSecrets:\n      APP_KEY: <@generateRandomString(32)>\n`,
    'Static (Nginx)': `services:\n  - hostname: web\n    type: static\n    enableSubdomainAccess: true\n`,
    'Object storage': `services:\n  - hostname: storage\n    type: object_storage_v1\n    objectStorageSize: 1\n`,
  };

  let yaml = $state(TEMPLATES['Node.js 22 (dev)']);
  let pickedTemplate = $state('Node.js 22 (dev)');
  let busy = $state(false);

  function applyTemplate(name) {
    pickedTemplate = name;
    yaml = TEMPLATES[name];
  }

  async function submit() {
    if (!yaml.trim()) { toast.error('YAML is required'); return; }
    busy = true;
    try {
      // ResponseProjectImport: { projectId, projectName, serviceStacks[] }.
      // Each new stack triggers its own first-deploy process server-side;
      // the activity log will surface them on the next poll. We just
      // refresh the parent's list.
      const res = await api.projectStackImport(projectId, { yaml });
      const names = (res?.serviceStacks || []).map((s) => s.name).filter(Boolean).join(', ');
      toast.success(
        'Stack import accepted',
        names ? `Created: ${names}` : 'Refreshing…',
      );
      onCreated?.(res);
      open = false;
    } catch (e) {
      toast.apiError('Import failed', e);
    } finally { busy = false; }
  }
</script>

<Modal bind:open title="New stack — import YAML">
  <div class="space-y-3 text-sm">
    <div>
      <div class="mb-2 text-xs uppercase tracking-widest text-slate-500">Template</div>
      <div class="flex flex-wrap gap-2">
        {#each Object.keys(TEMPLATES) as name}
          <button
            class="rounded border px-2 py-1 text-xs {pickedTemplate === name ? 'border-emerald-600 text-emerald-300' : 'border-slate-800 text-slate-400 hover:border-slate-700'}"
            onclick={() => applyTemplate(name)}
          >{name}</button>
        {/each}
      </div>
    </div>
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">YAML</span>
      <textarea
        rows="14"
        spellcheck="false"
        class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus:border-emerald-600 focus:outline-none"
        bind:value={yaml}
      ></textarea>
    </label>
    <p class="text-xs text-slate-500">
      Imports through <code class="text-slate-300">/project/&#123;id&#125;/service-stack/import</code>. Use <code>services:</code> at the top —
      the body must be the inner Zerops project import YAML, not a full <code>zerops.yaml</code>.
    </p>
  </div>

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={busy}>Cancel</Button>
    <Button size="sm" variant="primary" onclick={submit} disabled={busy || !yaml.trim()}>
      {busy ? 'Importing…' : 'Import stack'}
    </Button>
  {/snippet}
</Modal>
