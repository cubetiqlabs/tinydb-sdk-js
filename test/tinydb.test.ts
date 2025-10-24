import { describe, it, expect, vi } from 'vitest';
import {
    TinyDB,
    TinyDBError,
    OfflineError,
    CollectionSchemaDefinition,
    QueryRequest,
} from '../src/index';

interface RecordedRequest {
    url: string;
    init: RequestInit & { body?: any };
}

type Handler = (req: RecordedRequest) => Response | Promise<Response>;

function toUrlString(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    return input.url;
}

function createFetchStub(initialHandlers: Handler[] = []) {
    const queue: Handler[] = [...initialHandlers];
    const requests: RecordedRequest[] = [];

    const fetchFn = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
        const request: RecordedRequest = { url: toUrlString(input), init: { ...init } };
        requests.push(request);
        if (queue.length === 0) {
            throw new Error(`Unexpected fetch: ${request.url}`);
        }
        const handler = queue.shift()!;
        return handler(request);
    };

    const mock = vi.fn(fetchFn);

    return {
        fetch: mock,
        requests,
        push(handler: Handler) {
            queue.push(handler);
        },
        clear() {
            queue.length = 0;
        },
    };
}

function jsonResponse(body: any, status = 200, headers: Record<string, string> = {}): Response {
    const allHeaders = new Headers({ 'Content-Type': 'application/json', ...headers });
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return new Response(payload, { status, headers: allHeaders });
}

describe('TinyDB TypeScript client', () => {
    const endpoint = 'https://api.tinydb.test';

    it('creates a collection with schema via sync builder', async () => {
        const schema: CollectionSchemaDefinition = {
            fields: {
                name: { type: 'string', required: true },
            },
        };
        const stub = createFetchStub([
            () =>
                jsonResponse({
                    id: 'col-users',
                    tenant_id: 'tenant-1',
                    name: 'users',
                    schema_json: JSON.stringify(schema),
                    primary_key_field: '_doc_id',
                    primary_key_type: 'uuid',
                    primary_key_auto: true,
                    created_at: '2025-09-26T00:00:00Z',
                    updated_at: '2025-09-26T00:00:00Z',
                }, 201),
        ]);

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch });
        const users = await client.collection('users').schema(schema).sync();

        expect(users.details.name).toBe('users');
        expect(stub.requests).toHaveLength(1);
        const req = stub.requests[0];
        expect(req.url).toBe(`${endpoint}/api/collections`);
        const body = JSON.parse(req.init.body as string);
        expect(body.name).toBe('users');
        expect(body.schema).toBe(JSON.stringify(schema));
    });

    it('auto-creates collection when already exists', async () => {
        const existing = {
            id: 'col-orders',
            tenant_id: 'tenant-1',
            name: 'orders',
            schema_json: '',
            primary_key_field: '_doc_id',
            primary_key_type: 'uuid',
            primary_key_auto: true,
            created_at: '2025-09-26T00:00:00Z',
            updated_at: '2025-09-26T00:00:00Z',
        };
        const stub = createFetchStub([
            () => jsonResponse({ error: 'exists' }, 409),
            () => jsonResponse([existing]),
        ]);

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch });
        const orders = await client.collection('orders');

        expect(orders.details.id).toBe(existing.id);
        expect(stub.requests).toHaveLength(2);
        expect(stub.requests[1].url).toBe(`${endpoint}/api/collections`);
    });

    it('performs document lifecycle operations', async () => {
        const baseDoc = {
            id: 'doc-1',
            tenant_id: 'tenant-1',
            collection_id: 'col-users',
            key: 'doc-1',
            key_numeric: null,
            data: JSON.stringify({ name: 'Alice' }),
            version: 1,
            created_at: '2025-09-26T00:01:00Z',
            updated_at: '2025-09-26T00:01:00Z',
            deleted_at: null,
        };
        const bobDoc = {
            ...baseDoc,
            id: 'doc-2',
            key: 'doc-2',
            data: JSON.stringify({ name: 'Bob' }),
        };
        const eveDoc = {
            ...baseDoc,
            id: 'doc-3',
            key: 'doc-3',
            data: JSON.stringify({ name: 'Eve' }),
        };
        const stub = createFetchStub([
            () =>
                jsonResponse({
                    id: 'col-users',
                    tenant_id: 'tenant-1',
                    name: 'users',
                    schema_json: '',
                    primary_key_field: '_doc_id',
                    primary_key_type: 'uuid',
                    primary_key_auto: true,
                    created_at: '2025-09-26T00:00:00Z',
                    updated_at: '2025-09-26T00:00:00Z',
                }, 201),
            () => jsonResponse(baseDoc, 201),
            () => jsonResponse(baseDoc, 200),
            () => jsonResponse(baseDoc, 200),
            (req) => {
                const body = JSON.parse(req.init.body as string);
                expect(Array.isArray(body)).toBe(true);
                expect(body).toHaveLength(2);
                return jsonResponse({ items: [bobDoc, eveDoc] }, 201);
            },
            () => jsonResponse(undefined, 204),
            () => jsonResponse(undefined, 204),
            () => jsonResponse(undefined, 204),
        ]);

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch });
        const users = await client.collection('users');
        const created = await users.create({ name: 'Alice' });
        expect(created.data.name).toBe('Alice');
        expect(created.data._doc_id).toBe('doc-1');
    expect(created.version).toBe(1);

        const fetched = await users.get(created.id);
        expect(fetched.id).toBe(created.id);
    expect(fetched.version).toBe(1);

        const fetchedByPk = await users.get(created.key, { pk: true });
        expect(fetchedByPk.id).toBe(created.id);
    expect(fetchedByPk.version).toBe(1);

        const manyResult = await users.create([
            { name: 'Bob' },
            { name: 'Eve' },
        ]);
        expect(Array.isArray(manyResult)).toBe(true);
        const many = Array.isArray(manyResult) ? manyResult : [manyResult];
        expect(many).toHaveLength(2);
        expect(many[0].data.name).toBe('Bob');
        expect(many[1].data.name).toBe('Eve');
    expect(many[0].version).toBe(1);
    expect(many[1].version).toBe(1);

        await users.delete([created.id, many[0].id]);
        await users.purge(created.id);

    expect(stub.requests).toHaveLength(8);
    expect(stub.requests[4].url).toBe(`${endpoint}/api/collections/users/documents/bulk`);
    });

    it('runs query with DSL request body', async () => {
        const stub = createFetchStub([
            () =>
                jsonResponse({
                    id: 'col-users',
                    tenant_id: 'tenant-1',
                    name: 'users',
                    schema_json: '',
                    primary_key_field: '_doc_id',
                    primary_key_type: 'uuid',
                    primary_key_auto: true,
                    created_at: '2025-09-26T00:00:00Z',
                    updated_at: '2025-09-26T00:00:00Z',
                }, 201),
            (req) => {
                const body = JSON.parse(req.init.body as string) as QueryRequest;
                expect(body.where?.and?.[0]).toEqual({ name: { eq: 'Sambo' } });
                return jsonResponse({
                    items: [
                        {
                            id: 'doc-1',
                            tenant_id: 'tenant-1',
                            collection_id: 'col-users',
                            key: 'doc-1',
                            data: JSON.stringify({ name: 'Sambo' }),
                            created_at: '2025-09-26T00:02:00Z',
                            updated_at: '2025-09-26T00:02:00Z',
                        },
                    ],
                    pagination: { limit: 10, count: 1, next_cursor: 'cursor-1' },
                });
            },
        ]);

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch });
        const users = await client.collection('users');
        const result = await users.query({
            where: { and: [{ name: { eq: 'Sambo' } }] },
            limit: 10,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].data.name).toBe('Sambo');
        expect(result.pagination.next_cursor).toBe('cursor-1');
    });

    it('queues write operations when offline mode enabled', async () => {
        const stub = createFetchStub();
        // Ensure collection creation succeeds
        stub.push(() =>
            jsonResponse({
                id: 'col-users',
                tenant_id: 'tenant-1',
                name: 'users',
                schema_json: '',
                primary_key_field: '_doc_id',
                primary_key_type: 'uuid',
                primary_key_auto: true,
                created_at: '2025-09-26T00:00:00Z',
                updated_at: '2025-09-26T00:00:00Z',
            }, 201),
        );
        // First attempt to create document fails with network error
        stub.push(() => {
            throw new TypeError('network error');
        });
        // Flush should replay and succeed
        const replayDoc = {
            id: 'doc-offline',
            tenant_id: 'tenant-1',
            collection_id: 'col-users',
            key: 'doc-offline',
            data: JSON.stringify({ name: 'Offline' }),
            created_at: '2025-09-26T00:03:00Z',
            updated_at: '2025-09-26T00:03:00Z',
        };
        stub.push(() => jsonResponse(replayDoc, 201));

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch, offlineMode: true });
        const users = await client.collection('users');

        await expect(users.create({ name: 'Offline' })).rejects.toBeInstanceOf(OfflineError);
        await expect(client.flushOfflineQueue()).resolves.not.toThrow();
        expect(stub.requests).toHaveLength(3);
    });

    it('performs incremental sync', async () => {
        const stub = createFetchStub([
            () =>
                jsonResponse({
                    id: 'col-users',
                    tenant_id: 'tenant-1',
                    name: 'users',
                    schema_json: '',
                    primary_key_field: '_doc_id',
                    primary_key_type: 'uuid',
                    primary_key_auto: true,
                    created_at: '2025-09-26T00:00:00Z',
                    updated_at: '2025-09-26T00:00:00Z',
                }, 201),
            (req) => {
                expect(req.url).toContain('/sync');
                const url = new URL(req.url);
                expect(url.searchParams.get('since')).toBe('2025-09-25T00:00:00.000Z');
                return jsonResponse({
                    items: [
                        {
                            change_type: 'upsert',
                            document: {
                                id: 'doc-1',
                                tenant_id: 'tenant-1',
                                collection_id: 'col-users',
                                key: 'doc-1',
                                data: JSON.stringify({ name: 'Sync' }),
                                created_at: '2025-09-26T00:04:00Z',
                                updated_at: '2025-09-26T00:04:00Z',
                                version: 4,
                            },
                        },
                    ],
                    pagination: { limit: 100, has_more: false },
                    since: '2025-09-25T00:00:00.000Z',
                });
            },
        ]);

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch });
        const users = await client.collection('users');
        const result = await users.sync({ since: new Date('2025-09-25T00:00:00Z') });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].document.data.name).toBe('Sync');
        expect(result.pagination.has_more).toBe(false);
    });

    it('surface HTTP errors as TinyDBError', async () => {
        const stub = createFetchStub([
            () => jsonResponse({ error: 'bad request' }, 400),
        ]);

        const client = new TinyDB({ endpoint, apiKey: 'key', fetch: stub.fetch });
        await expect(client.collection('broken').schema({ fields: {} }).sync()).rejects.toBeInstanceOf(TinyDBError);
    });
});
