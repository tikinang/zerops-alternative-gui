<script>
  import Tabs from '../components/Tabs.svelte';
  import Table from '../components/Table.svelte';
  import { goOrg, nav, setTab } from '../lib/nav.svelte.js';
  import { userStore, loadUser } from '../lib/userStore.svelte.js';

  const tabs = [
    { id: 'clients', label: 'Clients' },
    { id: 'settings', label: 'User settings' },
    { id: 'security', label: 'Security & authentication' },
  ];

  let active = $state(nav.tab && tabs.some(t => t.id === nav.tab) ? nav.tab : 'clients');

  $effect(() => { loadUser().catch(() => {}); });

  const orgRows = $derived(
    (userStore.data?.clientUserList || []).map((cu) => ({
      id: cu.client?.id,
      accountName: cu.client?.accountName || '(unnamed)',
      role: cu.roleCode,
      status: cu.status,
    }))
  );

  const columns = [
    { key: 'accountName', label: 'Organization' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
  ];

  function selectOrg(row) {
    goOrg({ id: row.id, accountName: row.accountName });
  }
</script>

<Tabs {tabs} bind:active onChange={(id) => setTab(id)} />

<div class="mt-6">
  {#if active === 'clients'}
    {#if userStore.loading && !userStore.data}
      <p class="text-sm text-slate-500">Loading…</p>
    {:else if userStore.error && !userStore.data}
      <p class="text-sm text-rose-400">{userStore.error}</p>
    {:else}
      <div class="mb-3 text-sm text-slate-400">
        Signed in as <span class="text-slate-200">{userStore.data?.fullName || userStore.data?.email}</span>
      </div>
      <Table columns={columns} rows={orgRows} onRowClick={selectOrg} empty="No organizations." />
    {/if}
  {:else if active === 'settings'}
    <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
      User settings — not yet implemented.
    </div>
  {:else if active === 'security'}
    <div class="rounded-md border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
      Security &amp; authentication — not yet implemented.
    </div>
  {/if}
</div>
