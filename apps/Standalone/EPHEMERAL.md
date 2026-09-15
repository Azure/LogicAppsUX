# Local-only PR previews

The `ephemeral` PR label requests a production build of Standalone on a dedicated
Azure Static Web Apps (SWA) named environment, `pr<number>`. The PR receives a
deployment link and one updatable bot comment with the deployed revision.

**Phase 1 is local-workflow testing only.** It does not provide Azure sign-in,
clone Azure resources, or run the Vite development server. Azure-resource testing,
connector authorization, and the development-only template proxy are unavailable.
Preview code is public and PR-controlled: do not enter credentials or sensitive
workflow definitions. Never register these automatically updated origins as
Entra SPA callbacks.

This initial profile includes the workflow designers at `/` and `/v2` only.
Data Mapper, template, MCP, knowledge, and VS Code preview routes are not included.

## One-time setup

The workflows are disabled until a repository administrator sets
`EPHEMERAL_ENABLED` to `true`. Merge the trusted workflows and controller into
`main` before enabling them; `workflow_run` and cleanup execute code from the
default branch, never the PR checkout.
Existing PR branches must merge or rebase onto a revision containing the
`build:ephemeral` profile before they can build a preview.

1. Create or designate an SWA resource **exclusively for local-only previews**.
   Do not reuse the documentation site, release/demo site, or an authenticated
   preview host. Leave its default/production environment unused.
2. Create the GitHub environment `standalone-ephemeral` and restrict its deployment
   branches to the protected default branch **before granting Azure access**.
   Phase 1 is designed to run without manual environment approval only after
   provider sign-in blocking is verified on the deployed preview. Retain the
   repository's normal approval policy for workflows from forks.
3. Establish an Entra workload identity with GitHub OIDC federation for that
   environment. A dedicated user-assigned managed identity works with Azure Login
   without an app registration or client secret. Use issuer
   `https://token.actions.githubusercontent.com`, audience
   `api://AzureADTokenExchange`, and the repository-specific subject described below.
4. Grant that identity management access only to the dedicated SWA resource:
   read/list named environments, delete named environments, and retrieve its
   deployment token. It needs no access to Logic Apps, customer subscriptions,
   or workflow data. Have the Azure owner approve the role; do not grant
   subscription-wide Contributor for convenience.
5. Set the repository variables below. These identifiers are not secrets.
6. Create the lowercase `ephemeral` label, then enable the workflow.

### Repository-specific OIDC subject

LAUX uses a custom subject template containing `repository_owner_id`,
`repository_id`, and `context`. Its subject for this environment is:

```text
repository_owner_id:6844498:repository_id:399618999:environment:standalone-ephemeral
```

Do not use the default
`repo:Azure/LogicAppsUX:environment:standalone-ephemeral` subject: it does not match
this repository's tokens. Before configuring federation, read the live template
and repository identifiers:

```sh
gh api repos/Azure/LogicAppsUX/actions/oidc/customization/sub
gh api repos/Azure/LogicAppsUX --jq '{repository_owner_id: .owner.id, repository_id: .id}'
```

The custom format was also confirmed against the non-secret `subject claim`
reported by an existing Azure Login job. Recheck the expected subject if the
repository's OIDC policy changes; do not change that repository-wide policy for
this preview setup. See the
[GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc#customizing-the-subject-claims-for-an-organization-or-repository)
and [managed identity federation guide](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust-user-assigned-managed-identity).

### Repository variables

| Repository variable | Value |
|---|---|
| `EPHEMERAL_ENABLED` | `true` after setup; leave unset or `false` otherwise |
| `EPHEMERAL_CLIENT_ID` | Federated workload identity's application/client ID |
| `EPHEMERAL_TENANT_ID` | That identity's Entra tenant |
| `EPHEMERAL_SUBSCRIPTION_ID` | Subscription containing the dedicated SWA |
| `EPHEMERAL_RESOURCE_GROUP` | Resource group containing the dedicated SWA |
| `EPHEMERAL_STATIC_WEB_APP` | Dedicated SWA resource name, not its hostname |

For a user-assigned managed identity, use its **client ID** for
`EPHEMERAL_CLIENT_ID`, not its principal/object ID. The principal ID is used for
the Azure role assignment.

The publisher signs into Azure with OIDC, retrieves the resource's existing
deployment token through Azure management, masks it, and supplies it only to the
SWA upload action. There is no shared ARM token, client secret, or SWA token to
place in a PR build or frontend bundle. OIDC alone is not assumed to authenticate
the SWA content uploader; the uploader still receives its required deployment
token. Treat access to `listSecrets` as the ability to publish to the whole
dedicated site, which is why this resource must not host anything trusted.

The existing `STANDALONE_STATIC_WEB_APP` secret and release deployment workflow
are intentionally unchanged.

The documented management operations for a custom role are:

| Action | Purpose |
|---|---|
| `Microsoft.Web/staticSites/Read` | Parent-resource inspection |
| `Microsoft.Web/staticSites/listsecrets/action` | Retrieve the SWA deployment key |
| `Microsoft.Web/staticSites/builds/Read` | List/read named environments |
| `Microsoft.Web/staticSites/builds/Delete` | Remove named environments |

Assign the role at
`/subscriptions/<subscription>/resourceGroups/<group>/providers/Microsoft.Web/staticSites/<app>`,
not the resource group or subscription. Upload uses the retrieved key; it does
not require an ARM `builds/write` or `zipdeploy` permission. Confirm the actual
upload/delete path during activation. The SWA must allow deployment-token
authorization, and the retrieved key is **not** made short-lived by OIDC.

The custom role is preferred for least privilege, but is not mandatory. With
explicit approval, the existing **Contributor** role can instead be assigned at
that exact SWA resource scope. This grants broader management permissions,
including modification and deletion of the entire app, not just its previews.

Creating a custom role requires `Microsoft.Authorization/roleDefinitions/write`
over its assignable scopes. Assigning either a custom or built-in role still
requires `Microsoft.Authorization/roleAssignments/write` at the target scope.
Contributor access alone does not include either permission. If the current
account cannot assign roles, an authorized administrator must perform the
assignment; choosing a built-in role does not remove that requirement.

The CLI's environment list is an array with flattened fields. The controller
uses `buildId` as the identifier (falling back to `name` for older responses)
and `hostname` for the link. It always supplies the resource group, subscription,
and explicit environment name so Azure CLI cannot fall back to subscription-wide
resource discovery or deletion of `default`.

References: [SWA secrets CLI](https://learn.microsoft.com/en-us/cli/azure/staticwebapp/secrets),
[environment CLI](https://learn.microsoft.com/en-us/cli/azure/staticwebapp/environment),
and [Microsoft.Web permissions](https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/web-and-mobile).

## Lifecycle

| Action | Result |
|---|---|
| Add `ephemeral` | Build the PR head, then publish `pr<number>` and its link |
| Push while labelled | Rebuild and replace that PR's preview |
| Remove `ephemeral` | Remove its SWA environment and mark deployments inactive |
| Close or merge | Same cleanup |
| Reopen while labelled | Reconcile/recreate from the current head's build |
| Retry a stale run | Re-read current PR state and use only the current head |
| Every six hours | Reconcile labelled PRs and remove orphan `pr<number>` environments |

All mutations use the same per-PR concurrency group and never cancel an active
cleanup. Each job re-reads the current state, so a queued event is a request to
reconcile, not permission to replay an obsolete operation. A commit that arrives
during upload is shown as newer than the deployed revision. Closing/unlabelling
during upload triggers a post-upload cleanup. A force-cancelled job is recovered
by the scheduled sweep or manual reconciliation.

Forks can produce secretless builds under the repository's workflow-approval
rules. Their artifacts are associated through GitHub run/PR metadata, not a
PR-provided manifest. Ambiguous associations fail closed and can be reconciled
using an explicit PR number.

## Build and trust separation

- `standalone-ephemeral-build.yml` builds the exact PR head with read-only
  repository access, no persisted checkout credentials, no Azure credentials,
  and no publishing permissions.
- `standalone-ephemeral.yml` checks out only the default branch, validates the
  source workflow/run, current PR state/head, attempt-specific artifact, digest,
  ZIP paths/types/limits, and local-token exclusions. It never installs
  dependencies or executes scripts from the PR artifact.
- Only validated static content reaches SWA. The publisher replaces any
  PR-provided `staticwebapp.config.json` with its own configuration, disables API
  builds, and explicitly chooses a nonproduction named environment.
- The upload action is pinned to the verified `v1` branch commit
  `4d27395796ac319302594769cfe812bd207490b1`. The ambiguous `@v1` resolves to
  the older tag `1a947af9992250f3bc2e68ad0754c0b0c11566c9`, whose action metadata
  lacks `skip_api_build` and `deployment_environment`. Verify both inputs and
  retain the explicit environment when updating the pin. This pins the action
  metadata/entrypoint, not its upstream `staticappsclient:stable` container.
- Trusted routing uses exact 404 rules for `/.auth/login/aad` and
  `/.auth/login/github`, before a defensive `/.auth/*` catch-all, to block both
  default sign-in providers. The validator rejects missing, reordered, or altered
  provider policies and writes the validated trusted configuration, not PR policy.
  Neither the wildcard nor fallback exclusions alone disable SWA authentication.
- GitHub deployment records and comments distinguish the PR head from the actual
  deployed revision. Failures are surfaced in the trusted workflow and PR comment.

The `build:ephemeral` profile excludes local token-loading code and private public
configuration files while preserving the normal `build`, `dev`, and `start:arm`
paths. The ZIP validator is defense in depth, not proof that arbitrary PR
JavaScript is trustworthy.

### SWA authentication boundary

[SWA's documented provider-blocking policy](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization#block-an-authentication-provider)
is a provider-specific route with `statusCode: 404`. The default providers are
Microsoft Entra ID (`aad`) and GitHub (`github`); the documentation makes this
available on all plans without a custom provider, client secret, or identity
dependency. No extra provider-validation prerequisite is documented.
[Routing rules](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration#routes)
are evaluated in order, stop at the first match, and apply to all methods when
`methods` is omitted. Keep these exact rules ahead of the defensive auth wildcard,
without redirects, rewrites, or role/method restrictions. Leave public app access,
security headers, SPA fallback, and all 18 static-suffix exclusions unchanged.

The wildcard is not a universal deny rule for SWA-owned endpoints. Before this
fix, anonymous requests without following redirects observed `/.auth/login/aad`
returning 302, `/.auth/me` returning 200, and `/.auth/logout` returning 302 on the
named pilot preview despite the wildcard. SWA can handle reserved endpoints such
as `/.auth/me` and `/.auth/logout` ahead of static routing. Their responses are
not evidence that provider sign-in is enabled or disabled. The local harness
serves static files and applies route rules; it does not emulate that platform
service, and its 404 responses do not prove live SWA parity.

After a human merges this fix and the trusted `main` publisher deploys it, verify
anonymous GETs to **both** exact provider paths return 404 without a `Location`
header, using no credentials and without following redirects or logging in.
Record `/.auth/me` and `/.auth/logout` separately as platform-owned observations,
not required 404s. Until that deployment and check, exact-provider blocking is
locally validated policy, not a verified live result. Do not enter credentials,
register preview callback origins, or enable real-resource access to test it.

## Capacity and recovery

SWA currently permits 3 preview environments on Free and 10 on Standard.
Total storage across all environments is also limited (500 MB / 2 GB).
The validator conservatively caps each artifact at 250 MiB uncompressed, 64 MiB
per file, and 15,000 archive entries. Measure the build before choosing the tier.
Quota exhaustion is an error, never a reason to delete an active preview.

Build artifacts are retained for seven days. An already deployed current preview
does not require its artifact to remain available. Recreating a deleted preview
after artifact expiration requires rerunning its build.

Use **Actions > Reconcile Standalone Ephemeral > Run workflow** on `main`:
enter a PR number to reconcile one preview, or leave it empty to sweep all.
The sweep processes only canonical `pr<number>` environment names and never
targets `default`, production, or arbitrary Azure resources. API/authentication
errors are not treated as evidence that an environment is absent.

If setup fails, check the resource name/subscription, OIDC subject and environment
restrictions, role assignment, SWA capacity, and deployment authorization policy.
The deploy and delete paths must both work. Do not copy a user's CLI ARM token
into GitHub secrets as a workaround.

An upload error about multiple wildcard characters in a fallback exclusion is a
hosting-configuration failure, not an Azure permission failure. SWA accepts at
most one `*` per exclusion: `/*.*` is invalid. Use the explicit `/*.js`-style
exclusions for every suffix allowed by `scripts/ephemeral/validate.py`, retaining
the asset/API/dev-token/template/auth exclusions, both exact provider 404 rules,
and the defensive `/.auth/*` route.
The harness rejects unsupported patterns, and tests prevent suffix-list drift.
See [SWA fallback routes](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration#fallback-routes).

Publisher fixes must merge to `main` before retrying reconciliation of the pilot
PR. Do not label an infrastructure-fix PR `ephemeral` to test its own publisher:
the trusted workflow intentionally does not execute the PR's publishing code.
After merge, reconcile the pilot PR on `main` and verify its named environment,
`/` and `/v2` reloads, missing assets, both exact provider 404s as described above,
and the unused production environment. Local validation alone does not establish
live deployment success.

Turning `EPHEMERAL_ENABLED` off stops **both** publishing and automated cleanup.
Remove labels and verify cleanup (or run a final sweep) before disabling it.

## Verification and initial activation

Run from the repository root:

```sh
pnpm exec vitest run --config scripts/vitest.config.ts scripts/ephemeral apps/Standalone/vite-plugins/__test__
python3 -B -m unittest discover -s scripts/ephemeral -p 'test_*.py'
pnpm turbo run build:ephemeral --filter=standalone
python3 -B scripts/ephemeral/validate.py --directory apps/Standalone/dist .ephemeral-site
pnpm exec playwright test --config playwright.ephemeral.config.ts
```

On Windows use `py -3` instead of `python3`. The `Standalone Ephemeral Checks`
workflow validates the production archive and runs Chromium against that extracted
artifact using a static server, not Vite. If a local Chromium binary is missing,
run `pnpm exec playwright install chromium`. The validator requires a new output
directory; remove only your prior `.ephemeral-site` test output before repeating
the extraction. Production routing
rewrites client routes to `index.html` but leaves missing assets, API/dev-token
paths, and the template proxy as missing resources rather than serving HTML.

Before calling the integration live, use a disposable PR to verify label, push,
deep-link reload, local workflow editing, unlabel, close/reopen, stale completion,
fork approval, and a failed deployment/cleanup. Confirm two PRs receive distinct
origins. This final activation exercise requires configured Azure/GitHub access;
local mocked tests do not establish that those permissions are working.
