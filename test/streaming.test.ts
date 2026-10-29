import { describe, it, expect, vi } from 'vitest';
import { TinyDB } from '../src/index';

const endpoint = 'https://api.tinydb.test';
const colPayload = { id: 'c', tenant_id: 't', name: 'items', created_at: '', updated_at: '' };

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const doc = (n: number) => ({
    id: `d${n}`, tenant_id: 't', collection_id: 'c', key: `k${n}`, data: { n }, version: 1,
    created_at: '', updated_at: '', deleted_at: null,
});

function sse(...events: Array<{ seq?: number; type: string; id?: string } | string>): Response {
    const body = events
        .map((e) => (typeof e === 'string' ? e : `${e.seq ? `id: ${e.seq}\n` : ''}event: ${e.type}\ndata: ${JSON.stringify({ collection: 'items', ...e })}\n\n`))
        .join('');
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function open(handler: (url: URL, init: RequestInit) => Response | Promise<Response>) {
    const urls: URL[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = new URL(String(input));
        urls.push(url);
        if (url.pathname === '/api/collections' && init.method === 'POST') return json(colPayload, 201);
        if (url.pathname === '/api/collections') return json([colPayload]);
        return handler(url, init);
    });
    return { db: new TinyDB({ endpoint, apiKey: 'k', fetch: fetchFn as any, retry: false }), urls };
}

async function collect<T>(it: AsyncIterable<T>, max = 1000): Promise<T[]> {
    const out: T[] = [];
    for await (const v of it) {
        out.push(v);
        if (out.length >= max) break;
    }
    return out;
}

describe('pagination iterators', () => {
    it('iterate walks every page and stops at the end', async () => {
        const all = Array.from({ length: 5 }, (_, i) => doc(i));
        const { db, urls } = open((url) => {
            const offset = Number(url.searchParams.get('offset') ?? 0);
            const limit = Number(url.searchParams.get('limit'));
            return json({ items: all.slice(offset, offset + limit), pagination: { count: 5, limit, offset } });
        });
        const col = await db.collection('items');
        const got = await collect(col.iterate({ pageSize: 2 }));
        expect(got.map((d) => d.id)).toEqual(['d0', 'd1', 'd2', 'd3', 'd4']);
        const pages = urls.filter((u) => u.pathname.endsWith('/documents'));
        expect(pages.map((u) => u.searchParams.get('offset'))).toEqual(['0', '2', '4']);
    });

    it('iterate stops requesting once the caller breaks out', async () => {
        const { db, urls } = open((url) => {
            const offset = Number(url.searchParams.get('offset') ?? 0);
            return json({ items: [doc(offset), doc(offset + 1)], pagination: { count: 1000 } });
        });
        const col = await db.collection('items');
        await collect(col.iterate({ pageSize: 2 }), 3);
        expect(urls.filter((u) => u.pathname.endsWith('/documents'))).toHaveLength(2);
    });

    it('syncAll follows the cursor until has_more is false', async () => {
        const { db } = open((url) => {
            const cursor = url.searchParams.get('cursor');
            if (!cursor) return json({ items: [{ change_type: 'upsert', document: doc(1) }], pagination: { has_more: true, next_cursor: 'c2' } });
            return json({ items: [{ change_type: 'delete', document: doc(2) }], pagination: { has_more: false } });
        });
        const col = await db.collection('items');
        const got = await collect(col.syncAll());
        expect(got.map((c) => c.change_type)).toEqual(['upsert', 'delete']);
    });

    it('queryAll follows next_cursor', async () => {
        const seen: unknown[] = [];
        const { db } = open((url, init) => {
            const body = JSON.parse(String(init.body));
            seen.push(body.cursor ?? null);
            if (!body.cursor) return json({ items: [doc(1), doc(2)], pagination: { next_cursor: 'n1' } });
            return json({ items: [doc(3)], pagination: {} });
        });
        const col = await db.collection('items');
        const got = await collect(col.queryAll({ where: { and: [] }, pageSize: 2 }));
        expect(got).toHaveLength(3);
        expect(seen).toEqual([null, 'n1']);
    });
});

describe('watch', () => {
    it('yields events and exposes seq', async () => {
        const { db } = open(() => sse({ seq: 11, type: 'create', id: 'a' }, ': ping\n\n', { seq: 12, type: 'update', id: 'a' }));
        const col = await db.collection('items');
        const got = await collect(col.watch({ reconnect: false }));
        expect(got.map((e) => [e.seq, e.type])).toEqual([[11, 'create'], [12, 'update']]);
    });

    it('resumes from the last seq after the stream drops', async () => {
        let n = 0;
        const { db, urls } = open(() => {
            n++;
            return n === 1 ? sse({ seq: 5, type: 'create', id: 'a' }, { seq: 6, type: 'update', id: 'a' }) : sse({ seq: 7, type: 'delete', id: 'a' });
        });
        const col = await db.collection('items');
        const ac = new AbortController();
        const got: number[] = [];
        for await (const ev of col.watch({ reconnectDelayMs: 1, signal: ac.signal })) {
            got.push(ev.seq!);
            if (ev.seq === 7) ac.abort();
        }
        expect(got).toEqual([5, 6, 7]);
        const streams = urls.filter((u) => u.pathname === '/events');
        expect(streams[0].searchParams.get('since')).toBeNull();
        expect(streams[1].searchParams.get('since')).toBe('6');
    });

    it('starts from a given cursor and surfaces lagged', async () => {
        const { db, urls } = open(() => sse({ type: 'lagged', seq: 40 }, { seq: 41, type: 'create', id: 'x' }));
        const col = await db.collection('items');
        const got = await collect(col.watch({ since: 40, reconnect: false }));
        expect(urls.find((u) => u.pathname === '/events')!.searchParams.get('since')).toBe('40');
        expect(got.map((e) => e.type)).toEqual(['lagged', 'create']);
    });

    it('does not reconnect on an HTTP error such as an unknown collection', async () => {
        const { db, urls } = open(() => json({ message: 'collection not found' }, 404));
        const col = await db.collection('items');
        await expect(collect(col.watch())).rejects.toMatchObject({ status: 404 });
        expect(urls.filter((u) => u.pathname === '/events')).toHaveLength(1);
    });
});

describe('account endpoints', () => {
    it('reads usage and audit verification', async () => {
        const { db, urls } = open((url) =>
            url.pathname === '/api/usage'
                ? json({ suspended: false, limits: {}, usage: { documents: 3, storage_bytes: 9 }, requests: [] })
                : json({ ok: true, checked: 4, unsealed: 1, last_hash: 'h' })
        );
        expect((await db.usage(7)).usage.documents).toBe(3);
        expect(urls[urls.length - 1].searchParams.get('days')).toBe('7');
        const v = await db.verifyAudit();
        expect(v).toMatchObject({ ok: true, checked: 4, last_hash: 'h' });
    });

    it('lists audit entries with filters', async () => {
        const { db, urls } = open(() => json([{ id: 1, operation: 'update' }]));
        const rows = await db.audit({ operation: 'update', limit: 5, since: new Date('2026-01-01T00:00:00Z') });
        expect(rows).toHaveLength(1);
        const q = urls[urls.length - 1].searchParams;
        expect(q.get('operation')).toBe('update');
        expect(q.get('since')).toBe('2026-01-01T00:00:00.000Z');
    });
});
