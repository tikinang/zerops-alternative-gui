<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toasts.svelte.js';

  let {
    open = $bindable(false),
    mode = 'create',
    stackId,
    record = null,
    onChanged,
  } = $props();

  let publicPort = $state(443);
  let internalPort = $state(80);
  let internalProtocol = $state('tcp');
  let publicIpType = $state('IP_V4');
  let firewallPolicy = $state('BLACKLIST');
  let firewallAllowMyIp = $state(false);
  let firewallIpRangesInput = $state('');
  let busy = $state(false);

  $effect(() => {
    if (open) {
      publicPort = record?.publicPort ?? 443;
      internalPort = record?.internalPort ?? 80;
      internalProtocol = record?.internalProtocol || 'tcp';
      publicIpType = record?.publicIpType || 'IP_V4';
      firewallPolicy = record?.firewallPolicy || 'BLACKLIST';
      firewallAllowMyIp = !!record?.firewallAllowMyIp;
      firewallIpRangesInput = (record?.firewallIpRanges || []).join(', ');
    }
  });

  async function submit() {
    busy = true;
    const body = {
      publicPort: Number(publicPort) || 0,
      internalPort: Number(internalPort) || 0,
      internalProtocol,
      publicIpType,
      firewallPolicy,
      firewallAllowMyIp,
      firewallIpRanges: firewallIpRangesInput
        .split(/[,\s]+/).map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (mode === 'edit' && record?.id) {
        await api.portRoutingUpdate(record.id, body);
        toast.success('Port routing updated');
      } else {
        await api.stackPortRoutingCreate(stackId, body);
        toast.success('Port routing created');
      }
      open = false;
      onChanged?.();
    } catch (e) {
      toast.apiError(`${mode === 'edit' ? 'Update' : 'Create'} port routing failed`, e);
    } finally { busy = false; }
  }
</script>

<Modal bind:open title={`${mode === 'edit' ? 'Edit' : 'New'} public port routing`}>
  <div class="space-y-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">Public port *</span>
        <input type="number" bind:value={publicPort} class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" />
      </label>
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">Internal port *</span>
        <input type="number" bind:value={internalPort} class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" />
      </label>
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">Protocol</span>
        <select bind:value={internalProtocol} class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none">
          <option value="tcp">tcp</option>
          <option value="udp">udp</option>
        </select>
      </label>
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">IP type</span>
        <select bind:value={publicIpType} class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none">
          <option value="IP_V4">IPv4</option>
          <option value="IP_V6">IPv6</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="block text-xs uppercase tracking-widest text-slate-500">Firewall policy</span>
        <select bind:value={firewallPolicy} class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none">
          <option value="BLACKLIST">BLACKLIST (deny these)</option>
          <option value="WHITELIST">WHITELIST (allow only these)</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm self-end">
        <input type="checkbox" bind:checked={firewallAllowMyIp} class="accent-emerald-500" />
        <span class="text-slate-300">Allow my IP</span>
      </label>
    </div>
    <label class="block">
      <span class="block text-xs uppercase tracking-widest text-slate-500">Firewall IP ranges (comma-separated CIDRs)</span>
      <input class="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-100 focus:border-emerald-600 focus:outline-none" bind:value={firewallIpRangesInput} placeholder="10.0.0.0/8, 1.2.3.4/32" />
    </label>
  </div>

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={busy}>Cancel</Button>
    <Button size="sm" variant="primary" onclick={submit} disabled={busy}>
      {busy ? 'Saving…' : (mode === 'edit' ? 'Save' : 'Create')}
    </Button>
  {/snippet}
</Modal>
