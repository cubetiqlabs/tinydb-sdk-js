import { describe, it, expect, vi } from 'vitest';
import {
    TinyDB,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
    newIdempotencyKey,
} from '../src/index';

const endpoint = 'https://api.tinydb.test';

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

/** A client whose fetch replays the given responses (or throws a given error) in order. */
function client(steps: Array<Response | Error | ((url: string, init: RequestInit) => Response)>, retry = {}) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const sleeps: number[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        calls.push({ url: String(input), init });
        const step = steps.shift();
        if (!step) throw new Error('unexpected extra request');
        if (step instanceof Error) throw step;
        return typeof step === 'function' ? step(String(input), init) : step;
    });
    const db = new TinyDB({
        endpoint,
        apiKey: 'k',
        fetch: fetchFn as any,
        retry: { sleep: async (ms) => void sleeps.push(ms), random: () => 0.5, ...retry },
    });
    return { db, calls, sleeps };
}

const collectionsOK = () => json([]);

describe('retry', () => {
    it('retries an idempotent request on 503 with backoff and then succeeds', async () => {
        const { db, calls, sleeps } = client([json({ error: 'x' }, 503), json({ error: 'x' }, 503), collectionsOK()]);
        await db.collections();
        expect(calls).toHaveLength(3);
        expect(sleeps).toEqual([100, 200]); // random=0.5 of 200ms, then of 400ms
    });

    it('gives up after the configured retries and throws a typed ServerError', async () => {
        const { db, calls } = client([json({}, 503), json({}, 503), json({}, 503)]);
        await expect(db.collections()).rejects.toBeInstanceOf(ServerError);
        expect(calls).toHaveLength(3);
    });

    it('retries after a network error', async () => {
        const { db, calls } = client([new TypeError('fetch failed'), collectionsOK()]);
        await db.collections();
        expect(calls).toHaveLength(2);
    });

    it('does not retry a POST without an idempotency key, even on 503', async () => {
        const { db, calls } = client([json({}, 503), json({ id: 'd1' }, 201)]);
        await expect(
            db.requestInternal({ method: 'POST', path: '/api/collections/items/documents', body: {} })
        ).rejects.toBeInstanceOf(ServerError);
        expect(calls).toHaveLength(1);
    });

    it('retries a POST that carries an idempotency key, resending the same key', async () => {
        const key = newIdempotencyKey();
        const { db, calls } = client([json({}, 503), json({ ok: true }, 201)]);
        const out = await db.requestInternal<any>({
            method: 'POST',
            path: '/api/collections/items/documents',
            body: { a: 1 },
            idempotencyKey: key,
        });
        expect(out.ok).toBe(true);
        expect(calls).toHaveLength(2);
        expect((calls[0].init.headers as any)['Idempotency-Key']).toBe(key);
        expect((calls[1].init.headers as any)['Idempotency-Key']).toBe(key);
    });

    it('honours Retry-After on 429', async () => {
        const { db, sleeps } = client([json({}, 429, { 'Retry-After': '2' }), collectionsOK()]);
        await db.collections();
        expect(sleeps).toEqual([2000]);
    });

    it('does not retry a 429 without Retry-After (a daily quota will not clear in seconds)', async () => {
        const { db, calls } = client([json({ message: 'daily quota exceeded' }, 429)]);
        await expect(db.collections()).rejects.toBeInstanceOf(RateLimitError);
        expect(calls).toHaveLength(1);
    });

    it('surfaces a Retry-After longer than the cap instead of waiting for it', async () => {
        const { db, calls } = client([json({}, 429, { 'Retry-After': '3600' })]);
        const err = await db.collections().catch((e) => e);
        expect(err).toBeInstanceOf(RateLimitError);
        expect(err.retryAfterMs).toBe(3_600_000);
        expect(calls).toHaveLength(1);
    });

    it('can be switched off', async () => {
        const stub = vi.fn(async () => json({}, 503));
        const db = new TinyDB({ endpoint, apiKey: 'k', fetch: stub as any, retry: false });
        await expect(db.collections()).rejects.toBeInstanceOf(ServerError);
        expect(stub).toHaveBeenCalledTimes(1);
    });

    it('never retries client errors', async () => {
        const { db, calls } = client([json({ message: 'nope' }, 404)]);
        await expect(db.collections()).rejects.toBeInstanceOf(NotFoundError);
        expect(calls).toHaveLength(1);
    });
});

describe('typed errors', () => {
    it.each([
        [403, ForbiddenError],
        [404, NotFoundError],
        [409, ConflictError],
        [412, ConflictError],
        [422, ValidationError],
        [400, ValidationError],
    ])('maps %i to its class and keeps status and message', async (status, cls) => {
        const { db } = client([json({ message: 'why' }, status)]);
        const err = await db.collections().catch((e) => e);
        expect(err).toBeInstanceOf(cls);
        expect(err.status).toBe(status);
        expect(err.message).toBe('why');
    });
});

describe('idempotent create', () => {
    it('sends the key on create and retries safely', async () => {
        const doc = { id: 'd1', tenant_id: 't', collection_id: 'c', key: 'k', data: { a: 1 }, version: 1, created_at: '', updated_at: '', deleted_at: null };
        const colPayload = { id: 'c', tenant_id: 't', name: 'items', created_at: '', updated_at: '' };
        const { db, calls } = client([json([colPayload]), json({}, 503), json(doc, 201)]);
        const col = await db.collection('items');
        await col.create({ a: 1 }, { idempotencyKey: 'abc' });
        const posts = calls.filter((c) => c.url.endsWith('/documents'));
        expect(posts).toHaveLength(2);
        expect((posts[1].init.headers as any)['Idempotency-Key']).toBe('abc');
    });
});
