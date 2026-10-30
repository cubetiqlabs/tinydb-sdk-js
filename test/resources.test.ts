import { describe, it, expect, vi } from 'vitest';
import { TinyDB } from '../src/index';

const endpoint = 'https://api.tinydb.test';

interface Call {
    method: string;
    path: string;
    query: Record<string, string>;
    body: any;
    headers: Record<string, string>;
}

/** A client whose fetch records each call and answers with the queued bodies. */
function client(...answers: Array<unknown | { __status: number; body?: unknown }>) {
    const calls: Call[] = [];
    const queue = [...answers];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = new URL(String(input));
        calls.push({
            method: init.method ?? 'GET',
            path: url.pathname,
            query: Object.fromEntries(url.searchParams),
            body: init.body ? JSON.parse(String(init.body)) : undefined,
            headers: init.headers as Record<string, string>,
        });
        const next = queue.shift() as any;
        if (next && typeof next === 'object' && '__status' in next) {
            return new Response(next.body === undefined ? null : JSON.stringify(next.body), {
                status: next.__status,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify(next ?? {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    return { db: new TinyDB({ endpoint, apiKey: 'k', fetch: fetchFn as any, retry: false }), calls };
}

describe('snapshots', () => {
    it('creates by collection id, by name, for the tenant and for an app', async () => {
        const { db, calls } = client({ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' });
        await db.snapshots.create('col 1', { name: 'before', description: 'd', expiresAt: new Date('2027-01-01T00:00:00Z') });
        await db.snapshots.createByName('orders', { name: 'nightly' });
        await db.snapshots.createTenant({ name: 'all' });
        await db.snapshots.createApp('app-1', { name: 'app' });

        expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
            'POST /api/collections/col%201/snapshots',
            'POST /api/snapshots/by-name',
            'POST /api/snapshots/tenant',
            'POST /api/snapshots/app/app-1',
        ]);
        expect(calls[0].body).toMatchObject({ name: 'before', description: 'd', expires_at: '2027-01-01T00:00:00.000Z' });
        expect(calls[1].body).toMatchObject({ collection_name: 'orders', name: 'nightly' });
    });

    it('restores in place, replacing, or into a new collection', async () => {
        const { db, calls } = client({}, {}, {});
        await db.snapshots.restore('c1', 's1');
        await db.snapshots.restore('c1', 's1', { replaceAll: true });
        await db.snapshots.restore('c1', 's1', { replaceAll: true, targetCollection: 'recovered' });
        expect(calls[0].body).toEqual({});
        expect(calls[1].body).toEqual({ replace_all: true });
        // Restoring into a new collection never also deletes: replace_all is dropped.
        expect(calls[2].body).toEqual({ target_collection: 'recovered' });
    });

    it('verifies collection, tenant and app snapshots without restoring', async () => {
        const { db, calls } = client({ valid: true, checksum_recorded: true }, { valid: false, checksum_recorded: true, problems: ['x'] }, { valid: true, checksum_recorded: false });
        const a = await db.snapshots.verify('c1', 's1');
        const b = await db.snapshots.verifyTenant('s2');
        await db.snapshots.verifyApp('s3');
        expect(a.valid).toBe(true);
        expect(b.valid).toBe(false);
        expect(b.problems).toEqual(['x']);
        expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
            'POST /api/collections/c1/snapshots/s1/verify',
            'POST /api/snapshots/tenant/s2/verify',
            'POST /api/snapshots/app/snapshot/s3/verify',
        ]);
    });

    it('lists with paging and deletes', async () => {
        const { db, calls } = client({ items: [{ id: 's1' }], pagination: { total: 1 } }, { __status: 204 });
        const page = await db.snapshots.list('c1', { limit: 5, offset: 10 });
        await db.snapshots.delete('c1', 's1');
        expect(page.items).toHaveLength(1);
        expect(calls[0].query).toMatchObject({ limit: '5', offset: '10' });
        expect(calls[1]).toMatchObject({ method: 'DELETE', path: '/api/collections/c1/snapshots/s1' });
    });

    it('a corrupt snapshot surfaces as a typed validation error', async () => {
        const { db } = client({ __status: 422, body: { message: 'snapshot failed its integrity check' } });
        await expect(db.snapshots.restore('c1', 's1')).rejects.toMatchObject({ name: 'ValidationError', status: 422 });
    });

    it('sends an idempotency key on create', async () => {
        const { db, calls } = client({ id: 's1' });
        await db.snapshots.create('c1', { name: 'n' }, { idempotencyKey: 'k-1' });
        expect(calls[0].headers['Idempotency-Key']).toBe('k-1');
    });
});

describe('webhooks', () => {
    it('returns the secret on create and rotate only, and wires every route', async () => {
        const { db, calls } = client(
            { id: 'w1', secret: 'shh' },
            { id: 'w1' },
            { id: 'w1', secret: 'shh2' },
            { id: 'd1' },
            { id: 'd1' },
            { id: 'd2' },
            { items: [], pagination: {} },
            { __status: 204 },
            {},
        );
        const created = await db.webhooks.create({ name: 'n', url: 'https://x.test', events: ['document.created'] });
        const fetched = await db.webhooks.get('w1');
        const rotated = await db.webhooks.rotateSecret('w1');
        await db.webhooks.delivery('d1');
        await db.webhooks.redeliver('d1');
        await db.webhooks.deliveries('w1', { limit: 20 });
        await db.webhooks.delete('w1');
        await db.webhooks.test('w1');

        expect(created.secret).toBe('shh');
        expect(fetched.secret).toBeUndefined();
        expect(rotated.secret).toBe('shh2');
        expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
            'POST /api/webhooks',
            'GET /api/webhooks/w1',
            'POST /api/webhooks/w1/rotate-secret',
            'GET /api/webhooks/deliveries/d1',
            'POST /api/webhooks/deliveries/d1/redeliver',
            'GET /api/webhooks/w1/deliveries',
            'DELETE /api/webhooks/w1',
            'POST /api/webhooks/w1/test',
        ]);
    });

    it('updates with PUT and iterates every page', async () => {
        const mk = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ id: `w${from + i}` }));
        const { db, calls } = client({ id: 'w1' }, { items: mk(2, 0), pagination: { total: 3 } }, { items: mk(1, 2), pagination: { total: 3 } });
        await db.webhooks.update('w1', { enabled: false });
        const ids: string[] = [];
        for await (const w of db.webhooks.iterate(2)) ids.push(w.id);
        expect(calls[0]).toMatchObject({ method: 'PUT', body: { enabled: false } });
        expect(ids).toEqual(['w0', 'w1', 'w2']);
        expect(calls.slice(1).map((c) => c.query.offset)).toEqual(['0', '2']);
    });

    it('an app-scoped key is told it needs a tenant key', async () => {
        const { db } = client({ __status: 403, body: { message: 'this endpoint requires a tenant-scoped API key' } });
        await expect(db.webhooks.list()).rejects.toMatchObject({ name: 'ForbiddenError' });
    });
});

describe('schedules', () => {
    it('creates, lists, triggers and reads executions', async () => {
        const { db, calls } = client({ id: 'sch1' }, { schedules: [{ id: 'sch1' }], total: 1, limit: 50, offset: 0 }, { id: 'ex1', status: 'success' }, { executions: [], total: 0, limit: 50, offset: 0 }, { id: 'sch1' }, { __status: 204 });
        await db.schedules.create({ collection_id: 'c1', name: 'nightly', cron_expression: '0 3 * * *', retention_policy: { keep_daily: 7 } });
        const list = await db.schedules.list();
        const run = await db.schedules.trigger('sch1');
        await db.schedules.executions('sch1', { limit: 10 });
        await db.schedules.update('sch1', { enabled: false });
        await db.schedules.delete('sch1');

        expect(list.schedules).toHaveLength(1);
        expect(run.status).toBe('success');
        expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
            'POST /api/schedules',
            'GET /api/schedules',
            'POST /api/schedules/sch1/trigger',
            'GET /api/schedules/sch1/executions',
            'PUT /api/schedules/sch1',
            'DELETE /api/schedules/sch1',
        ]);
        expect(calls[0].body.retention_policy).toEqual({ keep_daily: 7 });
    });
});

describe('report and ingest', () => {
    it('posts a report request and returns rows', async () => {
        const { db, calls } = client({ data: [{ revenue: 12 }], pagination: { count: 1 } });
        const res = await db.report<{ revenue: number }>({
            collection: 'orders',
            aggregate: [{ alias: 'revenue', operation: 'sum', field: 'total' }],
            groupBy: ['region'],
        });
        expect(res.data[0].revenue).toBe(12);
        expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/query' });
        expect(calls[0].body.groupBy).toEqual(['region']);
    });

    it('ingests one record or a batch, retrying safely with a key', async () => {
        const { db, calls } = client({ ok: true, id: 'd1' }, { ok: true, results: [] });
        const one = await db.ingest('items', { external_id: 'A', name: 'Widget' });
        await db.ingest('items', [{ external_id: 'A' }, { external_id: 'B' }], { idempotencyKey: 'batch-1' });
        expect(one.id).toBe('d1');
        expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/ingest/items' });
        expect(Array.isArray(calls[1].body)).toBe(true);
        expect(calls[1].headers['Idempotency-Key']).toBe('batch-1');
    });
});
