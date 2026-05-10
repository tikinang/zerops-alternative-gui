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

The source of truth lives at `https://github.com/tikinang/zerops-alternative-gui`. Push from a git checkout outside the SSHFS mount (or from a clean local clone). The platform's `.git` inside `/var/www/appdev/` is for ZCP's push-deploy bookkeeping, not user history.

## Roadmap notes

- Restore passkey login once the SPA is reachable on a domain that's an authoritative WebAuthn RP for the user's existing passkeys (or once we add a passkey-registration flow specific to this origin).
- Personal access token login as a fallback for headless use.
- Inline log streaming (currently we hand the user the tokenized log URL).
- Mutations once we're ready to take responsibility for them — deploy, env edits, scaling, restart, subdomain toggle.
- Switch base URL back to prod (`api.app-prg1.zerops.io`) once the new read endpoints land there.
