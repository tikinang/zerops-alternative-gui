<script>
  let { columns = [], rows = [], onRowClick = null, empty = 'No rows.' } = $props();
</script>

<div class="overflow-x-auto rounded-lg border border-slate-800">
  <table class="min-w-full divide-y divide-slate-800 text-sm">
    <thead class="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
      <tr>
        {#each columns as col}
          <th class="px-4 py-2 font-medium">{col.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800 bg-slate-950">
      {#if rows.length === 0}
        <tr>
          <td colspan={columns.length} class="px-4 py-6 text-center text-slate-500">{empty}</td>
        </tr>
      {:else}
        {#each rows as row}
          <tr
            class="{onRowClick ? 'cursor-pointer hover:bg-slate-900' : ''}"
            onclick={onRowClick ? () => onRowClick(row) : null}
          >
            {#each columns as col}
              <td class="px-4 py-2 text-slate-200">
                {#if col.render}{@html col.render(row)}{:else}{row[col.key] ?? ''}{/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
