# TinyDB Live API Example

This example connects to a running TinyDB instance using the official TypeScript SDK. It does **not** mock any responses, so you will need a reachable TinyDB API endpoint and an API key before running it.

## Setup

1. Ensure the SDK is built so the example can import it:

```bash
cd ../../
npm run build
```

2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and update the values:

- `TINYDB_ENDPOINT` – URL to your TinyDB API (e.g. `http://localhost:8080`)
- `TINYDB_API_KEY` – API key with access to the collections you plan to manipulate
- `TINYDB_APP_ID` (optional) – application scope for API key if required

## Run the script

```bash
npm run start
```

The script will:

1. Bootstrap a `sdk_live_example` collection with a schema and primary key.
2. Create a demo document.
3. Fetch it by document ID and primary key.
4. Run a query DSL request.
5. Clean up by deleting (and optionally purging) the created document.

All responses are printed to the console so you can inspect the API payloads. Adjust the script to explore additional endpoints or workflows (sync, audit, etc.).
