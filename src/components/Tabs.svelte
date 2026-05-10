<script>
  let { tabs = [], active = $bindable(''), onChange } = $props();

  function pick(id) {
    active = id;
    onChange?.(id);
  }
</script>

<div class="border-b border-slate-800">
  <nav class="flex gap-1 overflow-x-auto">
    {#each tabs as tab}
      <button
        class="whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors {active === tab.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        onclick={() => pick(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>
</div>
