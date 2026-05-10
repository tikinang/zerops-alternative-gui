<script>
  import Button from './Button.svelte';
  import Confirm from './Confirm.svelte';
  import { api } from '../lib/api.js';
  import { track } from '../lib/processTracker.svelte.js';
  import { toast } from '../lib/toasts.svelte.js';

  let { stack, onChanged } = $props();

  let confirmState = $state({
    open: false, title: '', body: '', blastRadius: '', danger: false, action: null, label: 'Confirm',
  });

  function openConfirm(opts) {
    confirmState = { open: true, ...opts };
  }

  async function run(actionFn, label) {
    try {
      const proc = await actionFn(stack.id);
      if (proc && proc.id) {
        track(proc, { label, onFinished: onChanged });
      } else {
        toast.success(label, 'Done.');
        onChanged?.();
      }
    } catch (e) {
      toast.apiError(label, e);
    }
  }

  const sd = $derived(stack?.subdomainAccess);

  function start() {
    openConfirm({
      title: 'Start stack', body: `Start "${stack.name}"?`,
      blastRadius: 'Containers boot. No data is touched.',
      label: 'Start', danger: false, action: () => run(api.stackStart, 'Start ' + stack.name),
    });
  }
  function stop() {
    openConfirm({
      title: 'Stop stack', body: `Stop "${stack.name}"?`,
      blastRadius: 'All containers shut down. The service stops serving traffic until restarted.',
      label: 'Stop', danger: true, action: () => run(api.stackStop, 'Stop ' + stack.name),
    });
  }
  function restart() {
    openConfirm({
      title: 'Restart stack', body: `Restart "${stack.name}"?`,
      blastRadius: 'Containers cycle. Brief request interruption.',
      label: 'Restart', danger: false, action: () => run(api.stackRestart, 'Restart ' + stack.name),
    });
  }
  function reload() {
    openConfirm({
      title: 'Reload configuration', body: `Reload "${stack.name}"?`,
      blastRadius: 'In-place config refresh — no container cycle.',
      label: 'Reload', danger: false, action: () => run(api.stackReload, 'Reload ' + stack.name),
    });
  }
  function toggleSubdomain() {
    if (sd) {
      openConfirm({
        title: 'Disable subdomain', body: `Disable public subdomain access for "${stack.name}"?`,
        blastRadius: 'The *.zerops.app URL stops resolving to this stack until re-enabled.',
        label: 'Disable', danger: true, action: () => run(api.stackDisableSubdomain, 'Disable subdomain'),
      });
    } else {
      openConfirm({
        title: 'Enable subdomain', body: `Enable public subdomain access for "${stack.name}"?`,
        blastRadius: 'A *.zerops.app URL is provisioned and routed to this stack.',
        label: 'Enable', danger: false, action: () => run(api.stackEnableSubdomain, 'Enable subdomain'),
      });
    }
  }
  function clearBuildCache() {
    openConfirm({
      title: 'Clear build cache', body: `Drop the build cache for "${stack.name}"?`,
      blastRadius: 'Next build runs slower (no cached layers). No deployed code is touched.',
      label: 'Clear', danger: true, action: () => run(api.stackBuildCacheClear, 'Clear build cache'),
    });
  }
</script>

<div class="flex flex-wrap items-center gap-2">
  <Button size="sm" variant="secondary" onclick={start}>Start</Button>
  <Button size="sm" variant="ghost" onclick={restart}>Restart</Button>
  <Button size="sm" variant="ghost" onclick={reload}>Reload</Button>
  <Button size="sm" variant="ghost" onclick={toggleSubdomain}>{sd ? 'Disable subdomain' : 'Enable subdomain'}</Button>
  <Button size="sm" variant="ghost" onclick={clearBuildCache}>Clear build cache</Button>
  <Button size="sm" variant="danger" onclick={stop}>Stop</Button>
</div>

<Confirm
  bind:open={confirmState.open}
  title={confirmState.title}
  body={confirmState.body}
  blastRadius={confirmState.blastRadius}
  confirmLabel={confirmState.label}
  danger={confirmState.danger}
  onConfirm={confirmState.action}
/>
