<script>
  import Button from './Button.svelte';
  import Confirm from './Confirm.svelte';
  import { api } from '../lib/api.js';
  import { track } from '../lib/processTracker.svelte.js';
  import { toast } from '../lib/toasts.svelte.js';

  let { project, onChanged } = $props();

  let confirmState = $state({
    open: false, title: '', body: '', blastRadius: '', danger: false, action: null, label: 'Confirm',
  });

  function openConfirm(opts) { confirmState = { open: true, ...opts }; }

  async function run(actionFn, label) {
    try {
      const proc = await actionFn(project.id);
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

  function start() {
    openConfirm({
      title: 'Start project', body: `Start every stack in "${project.name}"?`,
      blastRadius: 'Every stack with autoStartup boots. Existing data untouched.',
      label: 'Start', danger: false, action: () => run(api.projectStart, 'Start project'),
    });
  }
  function stop() {
    openConfirm({
      title: 'Stop project', body: `Stop every stack in "${project.name}"?`,
      blastRadius: 'All stacks halt. The project goes offline until started.',
      label: 'Stop', danger: true, action: () => run(api.projectStop, 'Stop project'),
    });
  }
</script>

<div class="flex items-center gap-2">
  <Button size="sm" variant="secondary" onclick={start}>Start project</Button>
  <Button size="sm" variant="danger" onclick={stop}>Stop project</Button>
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
