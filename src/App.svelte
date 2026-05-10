<script>
  import Breadcrumbs from './components/Breadcrumbs.svelte';
  import Button from './components/Button.svelte';
  import Toasts from './components/Toasts.svelte';
  import NotificationBell from './components/NotificationBell.svelte';
  import Login from './views/Login.svelte';
  import User from './views/User.svelte';
  import Organization from './views/Organization.svelte';
  import Project from './views/Project.svelte';
  import Stack from './views/Stack.svelte';
  import Container from './views/Container.svelte';
  import Notifications from './views/Notifications.svelte';
  import { token, clearAuth } from './lib/auth.svelte.js';
  import { nav, goUser } from './lib/nav.svelte.js';
  import { initRouter, syncToUrl } from './lib/router.svelte.js';
  import { loadUser, clearUser } from './lib/userStore.svelte.js';
  import { setOn401 } from './lib/api.js';
  import { activity } from './lib/activity.svelte.js';
  import { toast } from './lib/toasts.svelte.js';

  let routerReady = $state(false);

  $effect(() => {
    initRouter();
    setOn401(() => {
      toast.error('Session expired', 'Please sign in again.');
      goUser();
      history.replaceState(null, '', '/');
    });
    routerReady = true;
  });

  // Whenever auth flips to logged-in, prefetch user info so org names
  // are available for breadcrumbs even on deep links.
  $effect(() => {
    if (token.loggedIn) loadUser().catch(() => {});
  });

  // Bind the activity (notifications) store to the currently focused org.
  $effect(() => {
    if (token.loggedIn && nav.org?.id) {
      activity.setClient(nav.org.id);
    }
  });

  // Reflect nav state into the URL.
  $effect(() => {
    if (!routerReady || !token.loggedIn) return;
    void nav.view;
    void nav.org?.id;
    void nav.project?.id;
    void nav.stack?.id;
    void nav.container?.id;
    void nav.tab;
    syncToUrl();
  });

  function logout() {
    clearAuth();
    clearUser();
    goUser();
    history.replaceState(null, '', '/');
  }
</script>

{#if !token.loggedIn}
  <Login />
{:else}
  <div class="flex min-h-full flex-col">
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <button class="text-sm font-semibold uppercase tracking-widest text-emerald-400" onclick={goUser}>
          Zerops · Alt GUI
        </button>
        <Breadcrumbs />
        <div class="flex items-center gap-2">
          {#if nav.org?.id}
            <NotificationBell />
          {/if}
          <Button variant="ghost" size="sm" onclick={logout}>Logout</Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
      {#if nav.view === 'user'}
        <User />
      {:else if nav.view === 'org'}
        <Organization />
      {:else if nav.view === 'project'}
        <Project />
      {:else if nav.view === 'stack'}
        <Stack />
      {:else if nav.view === 'container'}
        <Container />
      {:else if nav.view === 'notifications'}
        <Notifications />
      {/if}
    </main>
  </div>
{/if}

<Toasts />
