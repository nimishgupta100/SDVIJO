# AgriSat Alert — connected local prototype

## Run locally
1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm start`.
4. Visit `http://localhost:3000`.

No npm packages are required. The built-in Node.js server provides a small JSON-file API. Farm records, alert status changes, and profile preferences persist in `data/store.json`. Back up that file before resetting demo data.

## Connected functionality
- `GET/POST/DELETE /api/farms`: create, list and delete farms.
- `GET/PUT /api/settings`: persist profile/preferences.
- `GET/PATCH /api/alerts`: list alerts and change status.
- `GET /api/reports.csv`: download a farm CSV report.
- `GET /api/health`: health check.

## Important limits
The current alert records and crop-index chart are synthetic demonstration data. This update does **not** connect to live Sentinel satellite imagery, IMD weather feeds, SMS, WhatsApp, or real user authentication. Live geospatial data needs a provider and a farm boundary/coordinates; messaging needs provider credentials. Do not use demo alerts for agricultural decisions.

## Deployment
The app can run on a Node.js hosting service that supports a persistent writable disk. A platform with ephemeral storage may reset `data/store.json`; for production, replace the JSON file store with a managed database and add authentication, authorization, validation, backups, and rate limiting.
