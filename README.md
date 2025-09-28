# TinyDB JS/TS Client SDK

This package provides an ergonomic TypeScript client for TinyDB. It mirrors the scenarios described in [`docs/CLIENT_SDK.md`](../../docs/CLIENT_SDK.md) and exposes helpers for working with collections, documents, queries, and schema management from Node.js or modern browsers.

> **Status:** Work in progress. The public surface may change before the first stable release.

## Installation

```bash
npm install @tinydb/client
```

## Quick Start

```ts
import { TinyDB } from '@tinydb/client';

const db = new TinyDB({
    endpoint: process.env.TINYDB_ENDPOINT ?? 'http://localhost:8080',
    apiKey: process.env.TINYDB_API_KEY!,
    appId: process.env.TINYDB_APP_ID,
    offlineMode: true,
});

const users = await db
    .collection('users')
    .schema({
        fields: {
            name: { type: 'string', required: true },
            role: { type: 'string' },
            age: { type: 'number' },
        },
    })
    .sync();

const created = await users.create({
    name: 'Sambo',
    role: 'Developer',
    age: 29,
});

const refreshed = await users.get(created.id);
```

Refer to the [project documentation](../../docs/CLIENT_SDK.md) for more end-to-end use cases.

## Examples

-   `example` &mdash; CLI script that connects to a real TinyDB API (requires endpoint + API key).

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT © CUBIS Labs
