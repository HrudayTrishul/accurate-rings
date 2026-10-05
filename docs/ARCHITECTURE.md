# Architecture

## Shared workflow

The frontend reads a server-provided workspace and sends actions with the version it last read. The local API and hosted Worker share validation and report code in shared/workspace.mjs.

~~~mermaid
flowchart LR
  O[Customer order] --> B[Production lots]
  B --> P[Recorded output]
  P --> Q[Quality inspection]
  Q --> D[Approved dispatch quantity]
  D --> T[Transport confirmation]
  T --> F[Full delivery]
  F --> C[Realized order contribution]
~~~

Actions validate a cloned workspace. Only successful actions are persisted. Failed checks leave original data unchanged.

## Persistence

- **Local demo:** atomic JSON writes and a per-workspace update queue. A signing secret survives restarts.
- **Company mode:** a MySQL JSON document with row locks and transactions; accounts live in a separate users table.
- **Hosted demo:** a D1 document per random cookie session. Only a SHA-256 token hash is stored. Conditional version updates reject stale saves.

Incremental output is kept in a separate log. Completing a batch tomorrow does not move yesterday's output into tomorrow's report.

## Roles

| Capability | Admin | Staff | Customer |
| --- | --- | --- | --- |
| Operational records | All | All | Own orders/deliveries |
| Operational changes | Yes | Yes | No |
| Machine configuration | Yes | No | No |
| Costs and reports | Yes | No | No |
| Reset own sample workspace | Yes | No | No |

Permissions are enforced by the API. Customer responses omit inventory, production, machinery, quality, finance and other customers' records. Demo role selection is an explicit sandbox feature; company roles come from authenticated accounts.

## Security and failures

HttpOnly cookies, origin checks, bounded requests, hashed passwords, login throttling and parameterized SQL replace client-only permissions and plaintext login. GET endpoints never advance workflows. Stale saves return HTTP 409, refresh the frontend and ask the user to retry.

Hosted assets receive security headers and a Content Security Policy. Secrets and local records are excluded from publication. Local demo mode binds to 127.0.0.1.

## Deployment

The build emits React assets in dist/client and a Worker in dist/server/index.js. The Sites manifest defines the D1 DB binding; versioned migrations are packaged with deployment. Express remains available for independent local or company hosting.

## Remaining production work

A company installation should add a reviewed migration from existing tables, backups, account lifecycle management and material reservation rules. The sample app is not a production accounting or ERP system.
