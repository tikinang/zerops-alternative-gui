# Zerops Alternative GUI — repo guide

A power-user, observability-first alternative GUI for the Zerops platform. Pure client-rendered Svelte SPA, no SSR. Speaks the Zerops public REST API directly. Meant to be paired with the Zerops CLI (`zcli`).

## Tech stack

- Svelte 5 (runes mode) — `$state`, `$derived`, `$effect`, `$props`, `$bindable`
- Vite 6 — dev server and prod build
- Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no PostCSS config)
- No router library — view switching is a `$state` map in `src/lib/nav.svelte.js`
- Email + password login with optional TOTP step (no library — just `fetch` against the public REST API)

There is intentionally no auth library, no router, no UI kit. The whole runtime is a few hundred lines of Svelte + a thin fetch wrapper.

> **Why not passkeys?** Passkeys are bound to the relying-party domain they were registered against (`app-prg1.zerops.io` for prod, `app-ranpu.zerops.dev` for the ranpu testing env), so credentials registered in the official dashboard cannot be used from this app's `*.zerops.app` subdomain. Until the SPA runs under the same RP (or until the user re-registers a passkey for this app's origin), email + password is the practical path.

## Repo layout

```
src/
├── App.svelte                     # logged-in chrome (header + breadcrumbs + view switch)
├── main.js                        # mount entry
├── app.css                        # @import "tailwindcss"
├── components/
│   ├── Breadcrumbs.svelte         # User > Org > Project > Stack > Container
│   ├── Button.svelte              # variants: primary | secondary | ghost | danger
│   ├── Modal.svelte               # bind:open + slot content
│   ├── Table.svelte               # columns/rows + onRowClick
│   └── Tabs.svelte                # bound active id
├── views/
│   ├── Login.svelte               # email + password login, with TOTP follow-up if 2FA enabled
│   ├── User.svelte                # tabs: Clients | User settings | Security
│   ├── Organization.svelte        # tabs: Projects | Settings | Team | Billing
│   ├── Project.svelte             # tabs: Stacks | Routing | Env | Logs | Billing
│   └── Stack.svelte               # tabs: Containers | Routing | Pipelines | Backups | Scaling | Env | Logs
└── lib/
    ├── api.js                     # fetch wrapper + endpoint methods
    ├── auth.svelte.js             # $state token store with localStorage persistence (tracks 2FA pending state)
    └── nav.svelte.js              # $state navigation/selection
```

Only `Clients` (User), `Projects` (Org), `Stacks` (Project), and `Containers` (Stack) tabs render real data. Every other tab is intentional scaffolding — it shows the panel name with a "not yet implemented" placeholder so the IA is visible end to end.

## Configuration

`.env` (copy from `.env.example`):

```
VITE_API_URL=https://api.app-ranpu.zerops.dev
```

Currently pointed at the **ranpu testing environment** because it has many more public read endpoints than prod (project listing, stack listing, container listing, env, app-versions, backups, processes, port routing, http routing, etc.). Switch back to `https://api.app-prg1.zerops.io` once those endpoints land in prod.

Vite injects `import.meta.env.VITE_API_URL` at build time. `src/lib/api.js` falls back to `https://api.app-ranpu.zerops.dev` if the var is unset.

## Zerops services

The project has two runtime services with subdomain access enabled:

| Hostname   | Type        | Mode   | Purpose                                    | URL                                          |
| ---------- | ----------- | ------ | ------------------------------------------ | -------------------------------------------- |
| `appdev`   | `nodejs@22` | dev    | Vite dev server, edit via SSHFS            | `https://appdev-22a0-3000.prg1.zerops.app`   |
| `appstage` | `static`    | simple | Nginx serves the compiled SPA bundle       | `https://appstage-22a0.prg1.zerops.app`      |

`zerops.yaml` declares two setups:

- `appdev` — deploy source, `zsc noop` start, dev server launched via `zerops_dev_server`.
- `appstage` — `nodejs@22` build base compiles `dist`, runtime base `static` (Nginx) serves it. `deployFiles: [dist/~]` strips the `dist/` prefix so `index.html` lands at `/var/www/index.html`. Static runtime has built-in SPA fallback so unmatched paths route to `index.html`.

## API surface used today

Public REST base: `https://api.app-ranpu.zerops.dev/api/rest/public` (testing env — full spec at `/swagger/openapi.yml`).

All wrappers live in `src/lib/api.js`. Only `GET` (read) endpoints are wired today; mutations (deploy, env edit, restart, …) are intentionally absent until the surface stabilises.

| Feature                          | Endpoint                                                          | Notes |
| -------------------------------- | ----------------------------------------------------------------- | ----- |
| Login                            | `POST /auth/login`                                                | `{email, password}` → `auth.accessToken`. If `auth.twoFAMethods` includes `TOTP` and `auth.twoFAVerified` is `false`, prompt for the code. |
| TOTP step                        | `POST /2fa/totp/login`                                            | sent as `Bearer <accessToken>` from step 1; body `{token: "<6-digit>"}` |
| User + orgs                      | `GET /user/info`                                                  | returns `clientUserList[].client` — the user's organizations |
| **Project list** (Org → Projects)| `GET /client/{clientId}/project`                                  | full listing — replaces the previous name-search-only flow |
| Project detail                   | `GET /project/{id}`                                               | metadata for breadcrumbs / hydration |
| Project HTTP routing             | `GET /project/{id}/public-http-routing`                           | `list[]` of `OutDtoPublicHttpRouting` (domains, SSL, locations) |
| Project env file                 | `GET /project/{id}/env-file`                                      | rendered project-level env file |
| Project log                      | `GET /project/{id}/log`                                           | returns tokenized log URLs (`urlUi`/`urlPlain`/`url`/`urlInfo`), not log lines |
| **Stack list** (Project → Stacks)| `GET /project/{projectId}/service-stack`                          | full listing — replaces the previous name-search-only flow |
| Stack detail                     | `GET /service-stack/{id}`                                         | per-stack metadata, autoscaling, subdomain |
| **Container list**               | `GET /service-stack/{id}/container`                               | NEW — per-container listing (id, hostname, number, current hardware) |
| Stack env vars                   | `GET /service-stack/{id}/env`                                     | `items[]` of `OutDtoServiceStackEnv` (key, content, sensitive) |
| Stack app-versions (pipelines)   | `GET /service-stack/{id}/app-version`                             | deploy history |
| Stack backups                    | `GET /service-stack/{id}/backup`                                  | `files[]` + retention/period |
| Stack public port routing        | `GET /service-stack/{id}/public-port-routing`                     | TCP port forwards |
| Org team                         | `GET /client/{id}/user/list`                                      | `clientUserList[]` of `OutDtoClientUserExtra` |
| Org billing                      | `GET /client/{id}/billing-info`, `GET /billing/client/{id}/status`| billing detail + status |

There are also unused-but-wired wrappers in `api.js` for notifications, integration tokens, regions, settings, processes, user data, and external-repository integration status — ready to be plugged into views as needed.

## List-response shapes

The public REST API is not consistent about the field name for list payloads. When wiring a new endpoint, check the schema:

| Container field | Endpoints |
| --- | --- |
| `list[]` + `totalCount` | `client/{id}/project`, `project/{id}/service-stack`, `service-stack/{id}/container`, `service-stack/{id}/app-version`, `project/{id}/public-http-routing`, `service-stack/{id}/public-port-routing`, `client/{id}/user-notification` |
| `items[]` | `service-stack/{id}/env`, `region` |
| `files[]` | `service-stack/{id}/backup` |
| `clientUserList[]` | `client/{id}/user/list` |
| `projects[]` (legacy name-search only) | `client/{id}/projects-by-name/{name}` |

## Daily loop

The work happens through the ZCP harness (the `zerops_*` MCP toolset). The mount at `/var/www/appdev/` IS the runtime filesystem of the `appdev` container — edits land instantly via SSHFS.

```text
edit src/...                           # via Read/Edit/Write
zerops_dev_server action=restart \     # if Vite needs a kick
  hostname=appdev command="npm run dev" port=3000
# — verify on https://appdev-22a0-3000.prg1.zerops.app

zerops_deploy targetService=appstage \ # promote to stage
  sourceService=appdev setup=appstage
zerops_verify serviceHostname=appstage
# — verify on https://appstage-22a0-3000.prg1.zerops.app
```

Do not `git init` inside `/var/www/appdev/` — that path's `.git` is platform-managed for push-deploys.

## Versioning the source

The source of truth lives at `https://github.com/tikinang/zerops-alternative-gui`. The platform's `.git` inside `/var/www/appdev/` is push-deploy bookkeeping — never commit there.

A working clone lives on the ZCP host at **`/home/zerops/repos/zerops-alternative-gui`** authenticated via `GITHUB_REPO_PAT` (env var on the `zcp` service). Iteration loop from this session:

```bash
# 1. Sync the SSHFS mount into the working clone (excludes node_modules, .env, dist, .git)
rsync -a --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.env' \
  --exclude='dist' --exclude='.DS_Store' --exclude='*.log' \
  /var/www/appdev/ /home/zerops/repos/zerops-alternative-gui/

# 2. Commit + push
git -C /home/zerops/repos/zerops-alternative-gui add -A
git -C /home/zerops/repos/zerops-alternative-gui commit -m "..."
git -C /home/zerops/repos/zerops-alternative-gui push
```

Author config is per-repo (`tikinang <tikinang@gmail.com>`); never touch global git config. Remote URL embeds the PAT — read `GITHUB_REPO_PAT` from the `zcp` service env, not from the remote URL, when re-cloning.

## Roadmap notes

- Restore passkey login once the SPA is reachable on a domain that's an authoritative WebAuthn RP for the user's existing passkeys (or once we add a passkey-registration flow specific to this origin).
- Personal access token login as a fallback for headless use.
- Inline log streaming (currently we hand the user the tokenized log URL).
- Pipelines / deploy mutations: trigger pipeline, cancel build, deploy specific app version, set-as-next, backups (trigger / download / delete).
- Account & security mutations: PAT management, TOTP register / WebAuthn list+delete, recovery codes, password change, avatar upload.
- Cmd-K palette, keyboard nav, JSON debug viewer, copy-link affordances.
- Switch base URL back to prod (`api.app-prg1.zerops.io`) once the new read endpoints land there.

## Code review — 2026-05-10

Findings from a thorough self-review of the whole repo. Listed by severity with a recommended fix sketch. Treat this list as the punch-list before phases 5–7.

### High severity — confirmed bugs

1. **`api.js` `extractError` mis-handles real Zerops error shape.** Live API returns `{ "error": { "code": "...", "message": "...", "meta": [{ "error", "code", "metadata" }] } }` (object, not string). Current code does `return data.error;` which pushes an object into `new Error(...)` — final `err.message` becomes the string `"[object Object]"`. The toast body still pretty-prints the full payload, so the impact is the toast title and any non-toast error display (e.g. `Login.svelte`'s inline error). **Fix:** when `data.error` is an object, read `data.error.message`; walk `data.error.meta[0].metadata` for field reasons. (`src/lib/api.js:34-50`)

2. **Tab `active` state in views doesn't sync from external `nav.tab` changes.** Each view does `let active = $state(nav.tab && tabs.some(...) ? nav.tab : 'default');` — initialized once. Browser back / popstate updates `nav.tab` via `router.syncFromUrl`, but the local `active` stays. Symptom: clicking a tab, hitting browser-back, then seeing the URL revert while the UI keeps showing the previous tab. **Fix:** make `active` a `$derived(nav.tab && ... ? nav.tab : default)` and bind to it via `nav.tab = id` in `onChange`, OR add an `$effect` that mirrors `nav.tab` into `active`. Affected files: `Stack.svelte`, `Project.svelte`, `Organization.svelte`, `User.svelte`, `Notifications.svelte`.

3. **`CreateProjectModal` sends `userRoles: []`.** `RequestPostProject` requires `userRoles`. Empty array is structurally valid, but a project without any role likely won't be visible to the creator. The dashboard convention is `[{ id: <currentUserId>, roleCode: "OWNER" }]`. **Fix:** read the current user id from `userStore.data.id` and pass `[{ id, roleCode: 'OWNER' }]`. Untested against the live API — could 4xx as-is. (`src/components/CreateProjectModal.svelte:23-32`)

4. **Activity store doesn't reset on logout.** `logout()` in `App.svelte` calls `clearAuth()` and `clearUser()` but leaves `activity.clientId` set; the polling interval keeps running (token gate skips fetches, but the state lingers). On a quick logout/login as a different user into the same client, stale notifications can flash. **Fix:** add `clearActivity()` exporting `clientId = null; list = []; totalCount = 0;` and call from `logout()`. (`src/lib/activity.svelte.js`, `src/App.svelte:54-58`)

5. **Process tracker doesn't cancel `setTimeout` chains on logout.** Each in-flight tracked process schedules `setTimeout(poll, 2000)`. After logout the next tick fires `api.process(id)`, hits 401, fires the on401 handler, AND each call surfaces a "Session expired" toast. **Fix:** export `tracker.clear()` that empties the `tracked` Map and dismisses pinned toasts; call from `logout()`. (`src/lib/processTracker.svelte.js`)

6. **`activity.svelte.js` puts function references inside `$state`.** `$state({ ..., refresh, setClient })` — the proxy wraps function objects too. Reading `activity.refresh` in a reactive scope creates a dead dep. Calls work because the functions don't use `this`, but it's an idiomatic smell and easy to break later. **Fix:** keep `activity` as data only; export `refresh`/`setClient`/`clear` as plain module exports. Already the pattern for `acknowledge`/`acknowledgeAll`. (`src/lib/activity.svelte.js:9-17`)

7. **`EntityDetail` re-builds the polling interval on every tick.** The second `$effect` depends on `loaded`; the polling tick mutates `loaded`, which retriggers the effect → cleanup → new `setInterval`. Functionally correct, but ~half the polls fire from a fresh interval and timing skews. **Fix:** depend on `loaded?.id` (stable while same entity) and `isInflight(loaded)` (boolean), or run a single recursive `setTimeout` chain with a `cancelled` flag. (`src/components/EntityDetail.svelte:31-43`)

8. **`Login.svelte`'s `submitCredentials` shadows the imported `auth` $state.** `const auth = res.auth;` inside the handler shadows the module-level `auth` import. Works only because the handler doesn't touch the imported store after that line. Readability landmine — first reader will mis-attribute the assignment. **Fix:** rename local to `payload` or `responseAuth`. (`src/views/Login.svelte:22-28`)

9. **Login error display doesn't pretty-print payload.** Inline error in `Login.svelte` reads only `err.message`. With finding #1, that becomes `"[object Object]"` for the common error shape. **Fix:** after #1 lands, this becomes a real message; consider also rendering `err.payload` as a `<pre>` for parity with `toast.apiError`.

### Medium severity — UX gaps and edge cases

10. **NotificationBell badge: in-flight count OR unread count, not both.** The conditional `{#if inflightCount > 0} ... {:else if unread.length > 0}` hides the unread count whenever something is running. **Fix:** either show two badges (in-flight pulsing sky on top, unread emerald below) or render the in-flight number with an emerald dot for unread. (`src/components/NotificationBell.svelte:60-68`)

11. **In-flight count comes only from notifications, not from the local tracker.** When the user fires Start/Stop, the tracker has the process before the notifications API knows about it. Until the next 30 s poll, the badge can read `0`. **Fix:** combine `tracker.inflight.length + (activity.list.filter(isInflight).length)` — dedupe by id.

12. **`acknowledgeAll` is org-wide only.** `RequestUserNotification` accepts `projectId` / `serviceStackId` for narrower scope. The "Mark all read" button always acks everything. **Fix:** pass the current `nav.project?.id` / `nav.stack?.id` when one is selected; surface the scope in the button label.

13. **`CreateStackModal` assumes the response shape.** `res?.serviceStacks?.map(...)` and `res?.process?.id` — but `ResponseProjectImport` returns `{ projectId, projectName, serviceStacks }` per spec. There's no top-level `process`. Tracking the import as a single process is wrong; each new stack may have its own first-deploy process. **Fix:** iterate `serviceStacks`, optionally call `api.serviceStack(s.id)` to learn fresh state; refresh the stack list rather than tracking. (`src/components/CreateStackModal.svelte:30-37`)

14. **`startsAtTotp` evaluated once at module init.** In `Login.svelte`, the guard runs at script-execution time. Today this is fine because the component fully unmounts on login (App.svelte's `{#if !token.loggedIn}`), but if the Login surface were ever kept mounted across logout cycles, the gate would freeze. **Fix:** convert to `$derived(...)` so it tracks `auth` reactively. (`src/views/Login.svelte:7-14`)

15. **EnvVarForm edit mode disables the key input but still posts `{ key, content }`.** API requires the key but won't allow renaming an existing record (`/user-data/{id}` PUT). Current behaviour is correct but fragile — a future tweak to the disabled state could let users send a new key, which the server may accept silently or reject. **Fix:** in edit mode, omit `key` from the body and rely on the path param. (`src/components/EnvVarForm.svelte:34-50`)

16. **HttpRoutingForm port default falls back to 80 even when stack ports are loaded.** `stacks[0]?.ports?.[0]?.port || 80` — runs only on the very first render; afterwards `addLocation` uses the same fallback regardless of context. **Fix:** read the chosen stack's `ports[0].port` dynamically when `serviceStackId` changes.

17. **Project env editor races on save.** After `PUT /env/file` resolves, `loadEnv` re-fetches and overwrites `envFileText`. Edits made during the in-flight save are silently lost. **Fix:** snapshot the text at submit time, only overwrite if the textarea hasn't diverged from the snapshot at completion.

18. **Vite + SSHFS doesn't pick up file edits.** Documented in the daily-loop section, but worth re-stating for the review: the dev server needs a restart for every code change because SSHFS doesn't surface inotify events and we never set `CHOKIDAR_USEPOLLING=1`. **Fix:** set the env var in `appdev`'s service env (or in `zerops.yaml run.envVariables`), and in the local working copy.

19. **Views are getting heavy.** `Stack.svelte` (586 lines) and `Project.svelte` (444 lines) own the per-tab content. Each `$effect` block tracks a growing pile of `loadedFor` keys. **Refactor target:** one component per tab (`StackContainersTab.svelte`, `StackEnvTab.svelte`, …) consuming the parent's `nav.stack.id`. Lifting the load coordination becomes much cleaner once two more tabs exist (logs streaming, pipeline detail).

### Low severity — nits and polish

20. **`Toasts.svelte`'s `isMultiLine` heuristic switches to `<pre>` for any string > 80 chars.** Cosmetic; long single-line errors render as monospace. Acceptable.

21. **Modal lacks focus-trap and `aria-labelledby`.** Esc closes; tab navigates the page behind. For an admin tool this is fine, but worth fixing alongside keyboard-nav in phase 7.

22. **`Confirm` modal closes even when the action throws.** Caller is responsible for toasting the error, but the user has no inline retry. Acceptable.

23. **`zerops.yaml` for `appdev` uses `deployFiles: ./` (scalar) rather than the canonical `[.]` list.** Identical semantics; list form is the documented convention. Cosmetic.

24. **Form-control Tailwind class strings duplicated** across CreateProjectModal, CreateStackModal, EnvVarForm, HttpRoutingForm, PortRoutingForm, Project.svelte env editor, Login.svelte. **Fix candidate:** extract `<TextInput>` / `<Textarea>` / `<Select>` primitives, or define a `@layer components` block in `app.css`.

25. **`api.stackEnv` is now unused** (we read user-data instead). Either delete the wrapper or keep it for a future "Effective env" tab — flag the intent, don't leave it dormant.

26. **`api.authRefresh` exists but no caller wires it up.** Sessions just expire to 401 → re-login. That's deliberate per the phase 1 plan, but the export reads as production-ready. Add a TODO comment or remove until needed.

27. **Auth refresh-token rotation, CSRF, focus-trap** — all skipped by design for a personal-tier tool. Documented intent should land in this file's "Security posture" section once it grows non-trivial.

### Verified vs assumed

- **Verified against the OpenAPI spec** before coding: project create body, stack import body, HTTP/port routing bodies, user-data and project-env bodies, all list-shape field names (`list[]`, `items[]`, `files[]`, `clientUserList[]`).
- **Verified against the live ranpu API**: `/region` reachable unauthenticated; the error envelope is `{error:{code,message,meta:[{error,code,metadata}]}}` (informs finding #1).
- **Assumed (untested)**: project create accepts `userRoles: []` (finding #3); stack import response carries `process` (finding #13); `/2fa/totp/login` response sets `twoFAVerified: true` so `token.loggedIn` flips. Review these against a real successful call when the live test happens.

### Architecture / design

- **No tests.** Browser-tested through agent-browser only. Worth at least a `vitest` smoke harness for `format.js` and `api.js` URL building once mutations land.
- **No type-safety.** Plain JS, manual schema reading. Migration path: JSDoc + `svelte-check` for the lib layer, then Svelte's `<script lang="ts">` for components.
- **API responses not typed.** Each new endpoint costs a fresh schema-grep. A generated TS client from the OpenAPI YAML would pay back fast as the surface widens — `openapi-typescript` produces a single types file we could import.
- **`views/` carries layout + data fetching + tab content.** Worth splitting before phase 5 lands more controls.
