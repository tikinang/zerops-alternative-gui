<script>
  import Button from '../components/Button.svelte';
  import { api } from '../lib/api.js';
  import { auth, setAuth, clearAuth } from '../lib/auth.svelte.js';

  // Resume mid-2FA if a previous attempt persisted a token but didn't verify.
  const startsAtTotp = !!auth.accessToken
    && (auth.twoFAMethods || []).length > 0
    && auth.twoFAVerified !== true;

  let email = $state('');
  let password = $state('');
  let totpCode = $state('');
  let stage = $state(startsAtTotp ? 'totp' : 'credentials');
  let busy = $state(false);
  let error = $state('');

  async function submitCredentials(e) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      const res = await api.authLogin(email, password);
      const auth = res.auth;
      if (!auth?.accessToken) throw new Error('Login response had no access token.');

      setAuth(auth);

      const needs2FA = (auth.twoFAMethods || []).length > 0 && auth.twoFAVerified !== true;
      if (needs2FA) {
        const methods = (auth.twoFAMethods || []).map((m) => m.toUpperCase());
        if (!methods.includes('TOTP')) {
          error = `2FA required, but no TOTP method available (${methods.join(', ')}).`;
          return;
        }
        stage = 'totp';
      }
    } catch (err) {
      error = err?.message || 'Login failed.';
    } finally {
      busy = false;
    }
  }

  async function submitTotp(e) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      const res = await api.totpLogin(totpCode.trim());
      if (res?.auth) setAuth(res.auth);
    } catch (err) {
      error = err?.message || 'TOTP verification failed.';
    } finally {
      busy = false;
    }
  }

  function backToCredentials() {
    clearAuth();
    stage = 'credentials';
    totpCode = '';
    error = '';
  }
</script>

<div class="flex min-h-full items-center justify-center p-6">
  <div class="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
    <div class="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-emerald-400">Zerops Alternative GUI</div>
    <h1 class="mb-6 text-center text-xl font-semibold text-slate-100">
      {stage === 'totp' ? 'Two-factor code' : 'Sign in'}
    </h1>

    {#if stage === 'credentials'}
      <form onsubmit={submitCredentials} class="space-y-3">
        <label class="block text-xs font-medium text-slate-400">
          Email
          <input
            type="email"
            autocomplete="username"
            required
            bind:value={email}
            class="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            placeholder="you@example.com"
          />
        </label>
        <label class="block text-xs font-medium text-slate-400">
          Password
          <input
            type="password"
            autocomplete="current-password"
            required
            bind:value={password}
            class="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    {:else}
      <form onsubmit={submitTotp} class="space-y-3">
        <p class="text-xs text-slate-400">
          Enter the 6-digit code from your authenticator app, or a recovery code.
        </p>
        <label class="block text-xs font-medium text-slate-400">
          Code
          <input
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            required
            bind:value={totpCode}
            class="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            placeholder="000000"
          />
        </label>
        <div class="flex gap-2">
          <Button type="button" variant="ghost" onclick={backToCredentials} disabled={busy}>Back</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</Button>
        </div>
      </form>
    {/if}

    {#if error}
      <div class="mt-4 rounded-md border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
        {error}
      </div>
    {/if}

    <p class="mt-6 text-center text-[11px] text-slate-500">
      API: <code class="text-slate-400">{api.base}</code>
    </p>
  </div>
</div>
