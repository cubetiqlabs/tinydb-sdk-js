import 'dotenv/config.js';

import { TinyDB } from '../../dist/index.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value.trim();
}

async function main(): Promise<void> {
  const endpoint = requireEnv('TINYDB_ENDPOINT');
  const apiKey = requireEnv('TINYDB_API_KEY');
  const appId = process.env.TINYDB_APP_ID?.trim() || undefined;

  const client = new TinyDB({
    endpoint,
    apiKey,
    appId,
    offlineMode: false,
  });

  console.log('Connected to TinyDB endpoint:', endpoint);

  const collectionName = process.env.TINYDB_COLLECTION?.trim() || 'sdk_live_example';
  const email = `live-${Date.now()}@example.com`;

  console.log(`Ensuring collection '${collectionName}' with schema/primary key...`);
  const collection = await client
    .collection(collectionName)
    .schema({
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        note: { type: 'string' },
        created_at: { type: 'string' },
      },
    })
    .primary_key({ field: 'email', type: 'string', auto: false })
    .sync();

  console.log('Collection ready:', collection.details);

  console.log('Creating live document...');
  const created = await collection.create({
    email,
    name: 'Live Example User',
    note: 'Created via live SDK example',
    created_at: new Date().toISOString(),
  });
  console.log('Created document:', created);

  console.log('Fetching by document ID...');
  const fetchedById = await collection.get(created.id);
  console.log('Fetched by ID:', fetchedById);

  console.log('Fetching by primary key (email)...');
  const fetchedByPk = await collection.getByPk(email);
  console.log('Fetched by primary key:', fetchedByPk);

  console.log('Running query DSL...');
  const queryResult = await collection.query({
    where: {
      and: [
        {
          email: { eq: email },
        },
      ],
    },
    limit: 5,
  });
  console.log('Query result:', queryResult);

  const performPurge = (process.env.TINYDB_PURGE ?? '').toLowerCase() === 'true';
  console.log('Cleaning up created document (delete)...');
  await collection.delete(created.id);

  if (performPurge) {
    console.log('Purging document as well...');
    await collection.purge(created.id);
  }

  console.log('Live example finished successfully.');
}

main().catch((err) => {
  console.error('Live example failed:', err);
  process.exitCode = 1;
});
