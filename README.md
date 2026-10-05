# Accurate Rings
### Manufacturing operations, in one clear workspace

Accurate Rings is a full stack workspace for bearing ring production. It connects customer orders, stock records, production lots, machine usage, quality inspections, dispatches and order costs.

**Explore the sample workspace:** open the deployed app, choose Administrator, Staff or Customer, and select **Open sample workspace**. Each visitor receives an isolated, saved demo with explicitly labeled sample records.

## What you can do

- Create orders with products, quantities, prices, delivery dates and priority.
- Search, filter and export operational registers as CSV.
- Receive or issue stock with a reason, and see reorder alerts after reservations.
- Configure machines, schedule lots and record incremental output.
- Inspect lots and account for accepted, faulty, recovered and scrapped rings.
- Pack approved rings; confirm dispatch and delivery separately.
- Record six cost categories and compare forecast versus realized contribution.
- Review dated production, quality and energy summaries with an activity history.
- Use a customer view scoped to the customer's orders and deliveries.

## Run locally

Use **Node.js 24 LTS** and npm.

~~~sh
npm ci
npm run dev
~~~

Open **http://127.0.0.1:5173**. Frontend and backend start together. Demo mode needs no MySQL setup. JSON records and the signing secret are stored under backend/.data/, which is ignored by Git.

For a local production build:

~~~sh
npm run build
~~~

Set SERVE_FRONTEND=true and FRONTEND_URL=http://127.0.0.1:5000, then run npm start and open port 5000. Use the same hostname consistently because sessions use cookies.

## Verify

~~~sh
npm run check
~~~

Runs lint, workflow/API tests and a production build. Tests cover quantities, roles, partial deliveries, report dates, persistence, isolation and stale writes. GitHub Actions repeats these checks on pushes and pull requests.

## Runtime choices

| Runtime | Storage | Sign-in | Use |
| --- | --- | --- | --- |
| Local demo | Durable local JSON | Explicit sample roles | Development and demonstration |
| Hosted demo | Cloudflare D1 | Isolated sample sessions | Portfolio/demo deployment |
| Company backend | MySQL | Hashed accounts and server roles | Configurable company installation |

The hosted app is a working **sample environment**. Company login requires your configured Express/MySQL backend. It does not connect to a company database automatically.

See [company setup](docs/COMPANY_SETUP.md) and [architecture](docs/ARCHITECTURE.md).

## Technology

React 19 · React Router · Vite 8 · Lucide · Recharts · Leaflet · Express 5 · MySQL · bcrypt · signed HttpOnly sessions · Cloudflare Worker/D1 · Node test runner

## Operational boundaries

- Contribution is revenue minus recorded costs; taxes and unrecorded overhead are excluded.
- Full delivery changes a cost sheet from forecast to realized.
- Energy is estimated from runtime multiplied by rated power, not meter readings.
- Map markers show customer cities, not vehicle GPS.
- Inventory movements are manual. Production does not infer a material bill or issue stock.
- Reporting uses UTC calendar dates; displayed times follow the browser's timezone.
- Hosted sample sessions expire after 30 days.
- The v2 company model does not automatically migrate the original app's tables.

## Repository layout

~~~text
frontend/   Responsive React workspace
backend/    Express API, local storage and MySQL adapter
shared/     Workflow rules and report calculations
worker/     Hosted API and asset handler
db/         D1 schema
drizzle/    Versioned D1 migrations
tests/      Workflow and API checks
docs/       Architecture and company setup
~~~
