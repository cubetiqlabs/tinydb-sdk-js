/*
 * TinyDB TypeScript Client SDK
 * ---------------------------------
 * This entry point exposes the TinyDB client used in CLIENT_SDK.md examples.
 */

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface TinyDBOptions {
  endpoint: string;
  apiKey: string;
  appId?: string;
  offlineMode?: boolean;
  fetch?: FetchLike;
  /**
   * Retry policy for transient failures. Pass `false` to disable retries.
   * Idempotent requests (GET, PUT, DELETE) are retried on network errors and
   * 429/502/503/504; POST and PATCH only when an `idempotencyKey` was given,
   * because repeating them could otherwise duplicate the operation.
   */
  retry?: RetryOptions | false;
}

export interface RetryOptions {
  /** Retries after the first attempt. Default 2. */
  retries?: number;
  /** First backoff step in ms; doubles each retry, with full jitter. Default 200. */
  baseDelayMs?: number;
  /** Upper bound of one backoff step in ms. Default 5000. */
  maxDelayMs?: number;
  /**
   * Longest `Retry-After` the client will wait for. A longer wait is not
   * retried: the RateLimitError is thrown so the caller can decide. Default 30000.
   */
  maxRetryAfterMs?: number;
  /** Test hooks. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/** Options accepted by write calls. */
export interface WriteOptions {
  /**
   * Makes the write safe to retry: the server stores the first response under
   * this key for 24 hours and replays it for a repeat. Use `newIdempotencyKey()`.
   */
  idempotencyKey?: string;
}

/** A fresh random key for `WriteOptions.idempotencyKey`. */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export interface PrimaryKeyConfig {
  field?: string;
  type?: "uuid" | "number" | "string";
  auto?: boolean;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "uuid"
  | "date"
  | "datetime"
  | "object"
  | "array";

export interface CollectionFieldDefinition {
  type: FieldType;
  required?: boolean;
  allowNull?: boolean;
  description?: string;
  enum?: string[];
  items?: CollectionFieldDefinition;
}

export interface CollectionSchemaDefinition {
  fields: Record<string, CollectionFieldDefinition>;
  description?: string;
}

export type DocumentData<T = Record<string, any>> = T & { _doc_id: string };

export interface DocumentRecord<T = Record<string, any>> {
  id: string;
  tenant_id: string;
  collection_id: string;
  key: string;
  key_numeric?: number | null;
  data: DocumentData<T>;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Pagination {
  limit?: number;
  offset?: number;
  count?: number;
  next_cursor?: string;
  has_more?: boolean;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  select?: string[];
  filters?: Record<string, string | number | boolean>;
}

export interface ListResult<T = Record<string, any>> {
  items: DocumentRecord<T>[];
  pagination: Pagination;
}

export type OperatorMap = {
  eq?: any;
  neq?: any;
  lt?: any;
  lte?: any;
  gt?: any;
  gte?: any;
  contains?: any;
  startsWith?: any;
  endsWith?: any;
  in?: any[];
  notIn?: any[];
  exists?: boolean;
  isNull?: boolean;
  notNull?: boolean;
};

export type Condition = Record<string, OperatorMap>;

export interface WhereClause {
  and?: Condition[];
  or?: Condition[];
}

export interface OrderClause {
  field: string;
  direction?: "asc" | "desc";
}

export interface QueryRequest {
  where?: WhereClause;
  orderBy?: OrderClause[];
  limit?: number;
  offset?: number;
  select?: string[];
  cursor?: string;
}

export interface QueryResult<T = Record<string, any>> {
  items: DocumentRecord<T>[];
  pagination: Pagination;
}

export interface SyncParams {
  since?: string | Date;
  cursor?: string;
  limit?: number;
  includeDeleted?: boolean;
}

export interface SyncChange<T = Record<string, any>> {
  document: DocumentRecord<T>;
  change_type: "upsert" | "delete";
}

export interface SyncResult<T = Record<string, any>> {
  items: SyncChange<T>[];
  pagination: Pagination;
  since?: string;
}

export interface CollectionDetails {
  id: string;
  tenant_id: string;
  app_id?: string | null;
  name: string;
  schema_json?: string | null;
  schema?: any;
  primary_key_field?: string | null;
  primary_key_type?: string | null;
  primary_key_auto?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export class TinyDBError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "TinyDBError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** 401: missing or invalid API key. */
export class UnauthorizedError extends TinyDBError {
  constructor(message: string, code?: string, details?: any) {
    super(message, 401, code, details);
    this.name = "UnauthorizedError";
  }
}

/** 403: the key may not do this, the tenant is suspended, or a plan limit was reached. */
export class ForbiddenError extends TinyDBError {
  constructor(message: string, code?: string, details?: any) {
    super(message, 403, code, details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends TinyDBError {
  constructor(message: string, code?: string, details?: any) {
    super(message, 404, code, details);
    this.name = "NotFoundError";
  }
}

/** 409/412: the document changed underneath you, or the key already exists. */
export class ConflictError extends TinyDBError {
  constructor(message: string, status: number, code?: string, details?: any) {
    super(message, status, code, details);
    this.name = "ConflictError";
  }
}

/** 400/422: the request or the document was rejected as invalid. */
export class ValidationError extends TinyDBError {
  constructor(message: string, status: number, code?: string, details?: any) {
    super(message, status, code, details);
    this.name = "ValidationError";
  }
}

/** 429: rate or daily quota exceeded. `retryAfterMs` is set when the server said when to retry. */
export class RateLimitError extends TinyDBError {
  readonly retryAfterMs?: number;
  constructor(message: string, code?: string, details?: any, retryAfterMs?: number) {
    super(message, 429, code, details);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** 5xx: the server failed. Often safe to retry an idempotent request. */
export class ServerError extends TinyDBError {
  constructor(message: string, status: number, code?: string, details?: any) {
    super(message, status, code, details);
    this.name = "ServerError";
  }
}

interface QueuedOperation {
  url: string;
  init: RequestInit;
  parser: (res: Response) => Promise<unknown>;
}

export class OfflineError extends Error {
  readonly operation: QueuedOperation;

  constructor(message: string, operation: QueuedOperation) {
    super(message);
    this.name = "OfflineError";
    this.operation = operation;
  }
}

interface CollectionPayload {
  id: string;
  tenant_id: string;
  app_id?: string | null;
  name: string;
  schema_json?: string | null;
  primary_key_field?: string | null;
  primary_key_type?: string | null;
  primary_key_auto?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface DocumentPayload {
  id: string;
  tenant_id: string;
  collection_id: string;
  key: string;
  key_numeric?: number | null;
  data: string | null;
  version?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Me {
  tenant_id: string;
  tenant_name: string;
  app_id?: string;
  app_name?: string;
  status: string;
  key_prefix: string;
  created_at: string;
  updated_at: string;
}

type RequestParser<T> = (res: Response) => Promise<T>;

const jsonParser = async <T>(res: Response): Promise<T> => {
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error("Failed to parse JSON response");
  }
};

function parseCollection(payload: CollectionPayload): CollectionDetails {
  let schema: any;
  if (payload.schema_json) {
    try {
      schema = JSON.parse(payload.schema_json);
    } catch (error) {
      schema = { _raw: payload.schema_json };
    }
  }
  return {
    ...payload,
    schema,
  };
}

function parseDocument<T>(payload: DocumentPayload): DocumentRecord<T> {
  let data: any = {};
  if (payload.data) {
    try {
      data = JSON.parse(payload.data);
    } catch (error) {
      data = { _raw: payload.data };
    }
  }
  if (!data || typeof data !== "object") {
    data = {};
  }
  const docId = (data as any)._doc_id ?? payload.id;
  if (docId && typeof docId === "string") {
    (data as any)._doc_id = docId;
  } else {
    (data as any)._doc_id = payload.id;
  }
  const version =
    typeof payload.version === "number" && !Number.isNaN(payload.version)
      ? payload.version
      : 1;
  return {
    id: payload.id,
    tenant_id: payload.tenant_id,
    collection_id: payload.collection_id,
    key: payload.key,
    key_numeric: payload.key_numeric ?? undefined,
    data,
    version,
    created_at: payload.created_at,
    updated_at: payload.updated_at,
    deleted_at: payload.deleted_at ?? null,
  };
}

function toQueryValue(
  value: string | number | boolean | undefined
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return String(value);
}

function ensureFetch(fetchImpl?: FetchLike): FetchLike {
  const candidate = fetchImpl ?? globalThis.fetch;
  if (!candidate) {
    throw new Error(
      "fetch implementation is required. Provide options.fetch or ensure global fetch exists."
    );
  }
  return candidate.bind(globalThis);
}

function stringifySchema(
  schema?: CollectionSchemaDefinition
): string | undefined {
  if (!schema) {
    return undefined;
  }
  return JSON.stringify(schema, (_key, value) =>
    value === undefined ? undefined : value
  );
}

function buildURL(
  base: string,
  path: string,
  query?: Record<string, string | undefined>
): string {
  const trimmed = base.replace(/\/?$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(trimmed + normalized);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    return true;
  }
  if (
    err instanceof Error &&
    err.message &&
    /network|fetch failed|Failed to fetch/i.test(err.message)
  ) {
    return true;
  }
  return false;
}

async function parseError(response: Response): Promise<TinyDBError> {
  let payload: any;
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : undefined;
  } catch (error) {
    payload = undefined;
  }
  const message =
    payload?.message ||
    payload?.error_description ||
    payload?.error ||
    response.statusText ||
    "Request failed";
  const code = payload?.code || payload?.error;
  const status = response.status;
  if (status === 401) return new UnauthorizedError(message, code, payload);
  if (status === 403) return new ForbiddenError(message, code, payload);
  if (status === 404) return new NotFoundError(message, code, payload);
  if (status === 409 || status === 412) return new ConflictError(message, status, code, payload);
  if (status === 400 || status === 422) return new ValidationError(message, status, code, payload);
  if (status === 429) {
    return new RateLimitError(message, code, payload, parseRetryAfter(response.headers.get("Retry-After")));
  }
  if (status >= 500) return new ServerError(message, status, code, payload);
  return new TinyDBError(message, status, code, payload);
}

/** Parses a Retry-After header (seconds or an HTTP date) to milliseconds. */
function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const at = Date.parse(value);
  if (!Number.isNaN(at)) return Math.max(0, at - Date.now());
  return undefined;
}

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]);
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class CollectionBuilder<T extends Record<string, any> = Record<string, any>>
  implements PromiseLike<CollectionClient<T>>
{
  private schemaDef?: CollectionSchemaDefinition;
  private pkConfig?: PrimaryKeyConfig;

  constructor(
    private readonly client: TinyDB,
    private readonly name: string,
    private readonly onResolved?: (meta: CollectionDetails) => void
  ) {}

  schema(definition: CollectionSchemaDefinition): this {
    this.schemaDef = definition;
    return this;
  }

  primary_key(config: PrimaryKeyConfig): this {
    this.pkConfig = config;
    return this;
  }

  async sync(): Promise<CollectionClient<T>> {
    const meta = await this.client.ensureCollection({
      name: this.name,
      schema: this.schemaDef,
      primaryKey: this.pkConfig,
    });
    this.onResolved?.(meta);
    return new CollectionClient<T>(this.client, this.name, meta);
  }

  private async resolve(): Promise<CollectionClient<T>> {
    if (this.schemaDef || this.pkConfig) {
      return this.sync();
    }
    const meta = await this.client.ensureCollection({ name: this.name });
    this.onResolved?.(meta);
    return new CollectionClient<T>(this.client, this.name, meta);
  }

  then<TResult1 = CollectionClient<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: CollectionClient<T>) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.resolve().then(onfulfilled, onrejected);
  }
}

interface EnsureCollectionInput {
  name: string;
  schema?: CollectionSchemaDefinition;
  primaryKey?: PrimaryKeyConfig;
}

interface RequestOptions<T> {
  method: string;
  path: string;
  query?: Record<string, string | undefined>;
  body?: any;
  headers?: Record<string, string>;
  parser?: RequestParser<T>;
  allowOfflineQueue?: boolean;
  idempotencyKey?: string;
}

function backoff(
  policy: { baseDelayMs: number; maxDelayMs: number },
  attempt: number,
  random: () => number
): number {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt);
  return Math.floor(random() * ceiling);
}

export interface Usage {
  plan?: string;
  suspended: boolean;
  suspended_reason?: string;
  limits: {
    requests_per_day: number;
    storage_bytes: number;
    documents: number;
    collections: number;
    applications: number;
    api_keys: number;
  };
  usage: { documents: number; storage_bytes: number };
  collections: number;
  applications: number;
  api_keys: number;
  requests: { day: string; requests: number }[];
}

export interface AuditVerification {
  ok: boolean;
  checked: number;
  first_seq?: number;
  last_seq?: number;
  /** Keep this outside the database to detect truncation on a later check. */
  last_hash?: string;
  unsealed: number;
  broken_seq?: number;
  reason?: string;
}

export interface AuditEntry {
  id: number;
  collection_id: string;
  document_id: string;
  document_version: number;
  operation: string;
  actor?: string;
  old_data?: string;
  new_data?: string;
  created_at: string;
  seq?: number;
  hash?: string;
}

export interface AuditQuery {
  limit?: number;
  collection?: string;
  documentId?: string;
  operation?: string;
  actor?: string;
  since?: string | Date;
  until?: string | Date;
  sort?: string;
}

/** A change delivered by `watch`. `seq` is the cursor to resume from. */
export interface ChangeEvent {
  seq?: number;
  type: "create" | "update" | "delete" | "lagged";
  collection: string;
  id?: string;
  data?: string;
  key?: string;
  ts?: string;
}

export interface WatchOptions {
  /** Resume after this seq (the last event you processed). Omit for live-only. */
  since?: number;
  signal?: AbortSignal;
  /** Reconnect (resuming from the last seq) when the stream drops. Default true. */
  reconnect?: boolean;
  /** Wait before reconnecting, ms. Default 1000. */
  reconnectDelayMs?: number;
}

// ---- Snapshots, webhooks, schedules, reports and ingest ----------------------

export interface PageParams {
  limit?: number;
  offset?: number;
}

export interface Paged<T> {
  items: T[];
  pagination: { limit?: number; offset?: number; total?: number };
}

export interface Snapshot {
  id: string;
  collection_id: string;
  collection_name?: string;
  name: string;
  description?: string;
  document_count: number;
  compressed_size: number;
  original_size: number;
  checksum?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string | null;
}

export interface CreateSnapshotOptions {
  name: string;
  description?: string;
  /** RFC 3339. Past this time the server deletes the snapshot. */
  expiresAt?: string | Date;
}

export interface RestoreSnapshotOptions {
  /** Delete the collection's documents first (default: merge into what exists). */
  replaceAll?: boolean;
  /**
   * Restore into a new collection of this name instead; nothing existing is
   * changed and `replaceAll` is ignored.
   */
  targetCollection?: string;
}

export interface RestoreResult {
  ok: boolean;
  snapshot_id: string;
  collection_id: string;
  documents_restored: number;
  replace_all?: boolean;
  restored_at: string;
  /** Set when restoring into a new collection. */
  collection_name?: string;
  source_collection?: string;
}

export interface SnapshotVerification {
  snapshot_id: string;
  collection_id?: string;
  valid: boolean;
  checksum_recorded: boolean;
  checksum_matches?: boolean;
  documents_recorded?: number;
  documents_in_payload?: number;
  collections_recorded?: number;
  collections_in_payload?: number;
  /** Live documents a replace-all restore would delete first. */
  existing_documents?: number;
  problems?: string[];
}

export interface Webhook {
  id: string;
  name: string;
  description?: string;
  url: string;
  events: string[];
  collection_ids?: string[];
  headers?: Record<string, string>;
  max_retries: number;
  retry_backoff: number;
  enabled: boolean;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  created_at: string;
  updated_at: string;
  /** Signing secret: present only in the response to create and rotateSecret. */
  secret?: string;
}

export interface WebhookInput {
  name: string;
  url: string;
  events: string[];
  description?: string;
  collection_ids?: string[];
  headers?: Record<string, string>;
  max_retries?: number;
  retry_backoff?: number;
  enabled?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  status: "pending" | "success" | "failed" | "retry" | string;
  attempts: number;
  max_attempts: number;
  status_code?: number;
  response_body?: string;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
  completed_at?: string | null;
}

export interface RetentionPolicy {
  keep_last?: number;
  keep_days?: number;
  keep_daily?: number;
  keep_weekly?: number;
  keep_monthly?: number;
}

export interface BackupSchedule {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  cron_expression: string;
  snapshot_type?: string;
  retention_policy?: RetentionPolicy;
  enabled: boolean;
  next_run_at?: string | null;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleInput {
  collection_id: string;
  name: string;
  /** Standard five-field cron. */
  cron_expression: string;
  description?: string;
  snapshot_type?: "full" | "incremental";
  retention_policy?: RetentionPolicy;
  enabled?: boolean;
}

export interface BackupExecution {
  id: string;
  schedule_id: string;
  status: string;
  snapshot_id?: string;
  document_count?: number;
  size_bytes?: number;
  error_message?: string;
  started_at: string;
  completed_at?: string | null;
}

export interface ReportRequest {
  collection: string;
  where?: WhereClause;
  select?: string[];
  selectOnly?: boolean;
  orderBy?: OrderClause[];
  groupBy?: string[];
  aggregate?: {
    alias: string;
    operation: "count" | "sum" | "avg" | "min" | "max";
    field?: string;
    distinct?: boolean;
  }[];
  limit?: number;
  offset?: number;
}

export interface ReportResult<Row = Record<string, any>> {
  data: Row[];
  pagination?: { limit?: number; offset?: number; count?: number; truncated?: boolean; next_cursor?: string };
  warnings?: string[];
}

export interface IngestResult {
  ok: boolean;
  id?: string;
  [key: string]: any;
}

function pageQuery(p: PageParams = {}): Record<string, string | undefined> {
  return { limit: toQueryValue(p.limit), offset: toQueryValue(p.offset) };
}

function seg(v: string): string {
  return encodeURIComponent(v);
}

/** Collection and tenant snapshots (backups). Reach it as `db.snapshots`. */
export class SnapshotsClient {
  constructor(private readonly client: TinyDB) {}

  /** Snapshot a collection by id. */
  async create(collectionId: string, options: CreateSnapshotOptions, write: WriteOptions = {}): Promise<Snapshot> {
    return this.client.requestInternal<Snapshot>({
      method: "POST",
      path: `/api/collections/${seg(collectionId)}/snapshots`,
      body: snapshotBody(options),
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  /** Snapshot a collection by name. */
  async createByName(collectionName: string, options: CreateSnapshotOptions, write: WriteOptions = {}): Promise<Snapshot> {
    return this.client.requestInternal<Snapshot>({
      method: "POST",
      path: "/api/snapshots/by-name",
      body: { collection_name: collectionName, ...snapshotBody(options) },
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  /** Snapshot every collection of the tenant. Needs a tenant-scoped key. */
  async createTenant(options: CreateSnapshotOptions, write: WriteOptions = {}): Promise<Snapshot> {
    return this.client.requestInternal<Snapshot>({
      method: "POST",
      path: "/api/snapshots/tenant",
      body: snapshotBody(options),
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  /** Snapshot every collection of an application. */
  async createApp(appId: string, options: CreateSnapshotOptions, write: WriteOptions = {}): Promise<Snapshot> {
    return this.client.requestInternal<Snapshot>({
      method: "POST",
      path: `/api/snapshots/app/${seg(appId)}`,
      body: snapshotBody(options),
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  async list(collectionId: string, page: PageParams = {}): Promise<Paged<Snapshot>> {
    return this.client.requestInternal<Paged<Snapshot>>({
      method: "GET",
      path: `/api/collections/${seg(collectionId)}/snapshots`,
      query: pageQuery(page),
      parser: jsonParser,
    });
  }

  async get(collectionId: string, snapshotId: string): Promise<Snapshot> {
    return this.client.requestInternal<Snapshot>({
      method: "GET",
      path: `/api/collections/${seg(collectionId)}/snapshots/${seg(snapshotId)}`,
      parser: jsonParser,
    });
  }

  async delete(collectionId: string, snapshotId: string): Promise<void> {
    await this.client.requestInternal<void>({
      method: "DELETE",
      path: `/api/collections/${seg(collectionId)}/snapshots/${seg(snapshotId)}`,
      parser: async () => undefined,
    });
  }

  /**
   * Restore a snapshot. With `targetCollection` it is restored into a new
   * collection and nothing existing is touched. A snapshot that fails its
   * integrity check is refused with a ValidationError (422) before any change.
   */
  async restore(collectionId: string, snapshotId: string, options: RestoreSnapshotOptions = {}): Promise<RestoreResult> {
    const body: Record<string, any> = {};
    if (options.targetCollection) body.target_collection = options.targetCollection;
    else if (options.replaceAll) body.replace_all = true;
    return this.client.requestInternal<RestoreResult>({
      method: "POST",
      path: `/api/collections/${seg(collectionId)}/snapshots/${seg(snapshotId)}/restore`,
      body,
      parser: jsonParser,
    });
  }

  /** Check a snapshot's integrity without restoring it (a dry-run restore). */
  async verify(collectionId: string, snapshotId: string): Promise<SnapshotVerification> {
    return this.client.requestInternal<SnapshotVerification>({
      method: "POST",
      path: `/api/collections/${seg(collectionId)}/snapshots/${seg(snapshotId)}/verify`,
      parser: jsonParser,
    });
  }

  async verifyTenant(snapshotId: string): Promise<SnapshotVerification> {
    return this.client.requestInternal<SnapshotVerification>({
      method: "POST",
      path: `/api/snapshots/tenant/${seg(snapshotId)}/verify`,
      parser: jsonParser,
    });
  }

  async verifyApp(snapshotId: string): Promise<SnapshotVerification> {
    return this.client.requestInternal<SnapshotVerification>({
      method: "POST",
      path: `/api/snapshots/app/snapshot/${seg(snapshotId)}/verify`,
      parser: jsonParser,
    });
  }

  async restoreTenant(snapshotId: string, options: { replaceAll?: boolean } = {}): Promise<RestoreResult> {
    return this.client.requestInternal<RestoreResult>({
      method: "POST",
      path: `/api/snapshots/tenant/${seg(snapshotId)}/restore`,
      body: options.replaceAll ? { replace_all: true } : {},
      parser: jsonParser,
    });
  }

  async restoreApp(snapshotId: string, options: { replaceAll?: boolean } = {}): Promise<RestoreResult> {
    return this.client.requestInternal<RestoreResult>({
      method: "POST",
      path: `/api/snapshots/app/snapshot/${seg(snapshotId)}/restore`,
      body: options.replaceAll ? { replace_all: true } : {},
      parser: jsonParser,
    });
  }
}

function snapshotBody(o: CreateSnapshotOptions): Record<string, any> {
  return {
    name: o.name,
    description: o.description,
    expires_at: o.expiresAt instanceof Date ? o.expiresAt.toISOString() : o.expiresAt,
  };
}

/** Webhook subscriptions. Reach it as `db.webhooks`. Needs a tenant-scoped key. */
export class WebhooksClient {
  constructor(private readonly client: TinyDB) {}

  /** Create a subscription. The response carries the signing `secret` once: store it. */
  async create(input: WebhookInput, write: WriteOptions = {}): Promise<Webhook> {
    return this.client.requestInternal<Webhook>({
      method: "POST",
      path: "/api/webhooks",
      body: input,
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  async list(page: PageParams = {}): Promise<Paged<Webhook>> {
    return this.client.requestInternal<Paged<Webhook>>({
      method: "GET",
      path: "/api/webhooks",
      query: pageQuery(page),
      parser: jsonParser,
    });
  }

  async get(id: string): Promise<Webhook> {
    return this.client.requestInternal<Webhook>({ method: "GET", path: `/api/webhooks/${seg(id)}`, parser: jsonParser });
  }

  async update(id: string, changes: Partial<WebhookInput>): Promise<Webhook> {
    return this.client.requestInternal<Webhook>({
      method: "PUT",
      path: `/api/webhooks/${seg(id)}`,
      body: changes,
      parser: jsonParser,
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.requestInternal<void>({
      method: "DELETE",
      path: `/api/webhooks/${seg(id)}`,
      parser: async () => undefined,
    });
  }

  /** Send a test event now; resolves to the delivery record. */
  async test(id: string): Promise<Record<string, any>> {
    return this.client.requestInternal<Record<string, any>>({
      method: "POST",
      path: `/api/webhooks/${seg(id)}/test`,
      parser: jsonParser,
    });
  }

  /** Issue a new signing secret (returned once); the old one stops working at once. */
  async rotateSecret(id: string): Promise<Webhook> {
    return this.client.requestInternal<Webhook>({
      method: "POST",
      path: `/api/webhooks/${seg(id)}/rotate-secret`,
      parser: jsonParser,
    });
  }

  async deliveries(id: string, page: PageParams = {}): Promise<Paged<WebhookDelivery>> {
    return this.client.requestInternal<Paged<WebhookDelivery>>({
      method: "GET",
      path: `/api/webhooks/${seg(id)}/deliveries`,
      query: pageQuery(page),
      parser: jsonParser,
    });
  }

  async delivery(deliveryId: string): Promise<WebhookDelivery> {
    return this.client.requestInternal<WebhookDelivery>({
      method: "GET",
      path: `/api/webhooks/deliveries/${seg(deliveryId)}`,
      parser: jsonParser,
    });
  }

  /** Queue the same event again as a new delivery (the original stays as history). */
  async redeliver(deliveryId: string): Promise<WebhookDelivery> {
    return this.client.requestInternal<WebhookDelivery>({
      method: "POST",
      path: `/api/webhooks/deliveries/${seg(deliveryId)}/redeliver`,
      parser: jsonParser,
    });
  }

  /** Iterate every subscription, fetching `pageSize` at a time. */
  async *iterate(pageSize = 100): AsyncGenerator<Webhook> {
    let offset = 0;
    for (;;) {
      const page = await this.list({ limit: pageSize, offset });
      for (const w of page.items) yield w;
      offset += page.items.length;
      if (page.items.length < pageSize || (page.pagination.total !== undefined && offset >= page.pagination.total)) return;
    }
  }
}

/** Backup schedules. Reach it as `db.schedules`. Needs a tenant-scoped key. */
export class SchedulesClient {
  constructor(private readonly client: TinyDB) {}

  async create(input: ScheduleInput, write: WriteOptions = {}): Promise<BackupSchedule> {
    return this.client.requestInternal<BackupSchedule>({
      method: "POST",
      path: "/api/schedules",
      body: input,
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  async list(page: PageParams = {}): Promise<{ schedules: BackupSchedule[]; total: number; limit: number; offset: number }> {
    return this.client.requestInternal<{ schedules: BackupSchedule[]; total: number; limit: number; offset: number }>({
      method: "GET",
      path: "/api/schedules",
      query: pageQuery(page),
      parser: jsonParser,
    });
  }

  async get(id: string): Promise<BackupSchedule> {
    return this.client.requestInternal<BackupSchedule>({ method: "GET", path: `/api/schedules/${seg(id)}`, parser: jsonParser });
  }

  async update(id: string, changes: Partial<ScheduleInput>): Promise<BackupSchedule> {
    return this.client.requestInternal<BackupSchedule>({
      method: "PUT",
      path: `/api/schedules/${seg(id)}`,
      body: changes,
      parser: jsonParser,
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.requestInternal<void>({
      method: "DELETE",
      path: `/api/schedules/${seg(id)}`,
      parser: async () => undefined,
    });
  }

  /** Run the schedule now; resolves to the execution record. */
  async trigger(id: string): Promise<BackupExecution> {
    return this.client.requestInternal<BackupExecution>({
      method: "POST",
      path: `/api/schedules/${seg(id)}/trigger`,
      parser: jsonParser,
    });
  }

  async executions(id: string, page: PageParams = {}): Promise<{ executions: BackupExecution[]; total: number; limit: number; offset: number }> {
    return this.client.requestInternal<{ executions: BackupExecution[]; total: number; limit: number; offset: number }>({
      method: "GET",
      path: `/api/schedules/${seg(id)}/executions`,
      query: pageQuery(page),
      parser: jsonParser,
    });
  }
}

export class TinyDB {
  private readonly fetchImpl: FetchLike;
  private readonly endpoint: string;
  private readonly appId?: string;
  private readonly offlineMode: boolean;
  private readonly baseHeaders: Record<string, string>;
  private readonly offlineQueue: QueuedOperation[] = [];
  private readonly retryPolicy: Required<Omit<RetryOptions, "sleep" | "random">> & Pick<RetryOptions, "sleep" | "random">;

  constructor(private readonly options: TinyDBOptions) {
    if (!options?.endpoint) {
      throw new Error("endpoint is required");
    }
    if (!options?.apiKey) {
      throw new Error("apiKey is required");
    }
    this.endpoint = options.endpoint.replace(/\/?$/, "/");
    this.appId = options.appId;
    this.offlineMode = Boolean(options.offlineMode);
    this.fetchImpl = ensureFetch(options.fetch);
    const retry = options.retry === false ? { retries: 0 } : options.retry ?? {};
    this.retryPolicy = {
      retries: retry.retries ?? 2,
      baseDelayMs: retry.baseDelayMs ?? 200,
      maxDelayMs: retry.maxDelayMs ?? 5000,
      maxRetryAfterMs: retry.maxRetryAfterMs ?? 30000,
      sleep: retry.sleep,
      random: retry.random,
    };
    this.baseHeaders = {
      Accept: "application/json",
      "X-API-Key": options.apiKey,
    };
    if (this.appId) {
      this.baseHeaders["X-App-ID"] = this.appId;
    }
  }

  collection<T extends Record<string, any> = Record<string, any>>(
    name: string
  ): CollectionBuilder<T> {
    if (!name || !name.trim()) {
      throw new Error("collection name is required");
    }
    return new CollectionBuilder<T>(this, name.trim());
  }

  async collections(): Promise<CollectionDetails[]> {
    const payload = await this.requestInternal<CollectionPayload[]>({
      method: "GET",
      path: "/api/collections",
      parser: jsonParser,
    });
    return payload.map(parseCollection);
  }

  async flushOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const operation = this.offlineQueue[0];
      try {
        const response = await this.fetchImpl(operation.url, operation.init);
        if (!response.ok) {
          throw await parseError(response);
        }
        await operation.parser(response.clone());
        this.offlineQueue.shift();
      } catch (error) {
        // keep operation in queue and propagate
        throw error;
      }
    }
  }

  async ensureCollection(
    input: EnsureCollectionInput
  ): Promise<CollectionDetails> {
    const body: Record<string, any> = { name: input.name };
    const schemaStr = stringifySchema(input.schema);
    if (schemaStr) {
      body.schema = schemaStr;
    }
    if (this.appId) {
      body.app_id = this.appId;
    }
    if (input.primaryKey) {
      const pk: any = {};
      if (input.primaryKey.field) {
        pk.field = input.primaryKey.field;
      }
      if (input.primaryKey.type) {
        pk.type = input.primaryKey.type;
      }
      if (input.primaryKey.auto !== undefined) {
        pk.auto = input.primaryKey.auto;
      }
      if (Object.keys(pk).length > 0) {
        body.primary_key = pk;
      }
    }
    try {
      const created = await this.requestInternal<CollectionPayload>({
        method: "POST",
        path: "/api/collections",
        body,
        parser: jsonParser,
        allowOfflineQueue: false,
      });
      return parseCollection(created);
    } catch (error) {
      if (error instanceof TinyDBError && error.status === 409) {
        // Collection already exists. Update schema if provided, otherwise fetch metadata.
        if (schemaStr) {
          const updated = await this.requestInternal<CollectionPayload>({
            method: "PUT",
            path: `/api/collections/${encodeURIComponent(input.name)}`,
            body: { schema: schemaStr },
            parser: jsonParser,
            allowOfflineQueue: false,
          });
          return parseCollection(updated);
        }
        const existing = await this.describeCollection(input.name);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async describeCollection(name: string): Promise<CollectionDetails> {
    const listings = await this.collections();
    const lowered = name.toLowerCase();
    const found = listings.find((col) => col.name.toLowerCase() === lowered);
    if (!found) {
      throw new TinyDBError(
        `collection ${name} not found`,
        404,
        "collection_not_found"
      );
    }
    return found;
  }

  /** @internal */
  async requestInternal<T>(options: RequestOptions<T>): Promise<T> {
    const parser: RequestParser<T> = options.parser ?? jsonParser;
    const url = buildURL(this.endpoint, options.path, options.query);
    const headers: Record<string, string> = {
      ...this.baseHeaders,
      ...(options.headers ?? {}),
    };
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      if (options.body instanceof FormData || options.body instanceof Blob) {
        body = options.body as BodyInit;
      } else {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(options.body, (_key, value) =>
          value === undefined ? undefined : value
        );
      }
    }
    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }
    const init: RequestInit = {
      method: options.method,
      headers,
      body,
    };
    try {
      const response = await this.sendWithRetry(
        url,
        init,
        IDEMPOTENT_METHODS.has(options.method) || Boolean(options.idempotencyKey)
      );
      return await parser(response.clone());
    } catch (error) {
      if (
        this.offlineMode &&
        options.allowOfflineQueue &&
        options.method !== "GET" &&
        isNetworkError(error)
      ) {
        const queued: QueuedOperation = {
          url,
          init: { ...init },
          parser: parser as RequestParser<unknown>,
        };
        this.offlineQueue.push(queued);
        throw new OfflineError("Request queued while offline", queued);
      }
      if (error instanceof TinyDBError || error instanceof OfflineError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Sends one request, retrying transient failures with exponential backoff and
   * full jitter. A `Retry-After` from the server replaces the computed delay.
   * Returns the successful response or throws the typed error.
   */
  private async sendWithRetry(url: string, init: RequestInit, safeToRepeat: boolean): Promise<Response> {
    const policy = this.retryPolicy;
    const sleep = policy.sleep ?? defaultSleep;
    const random = policy.random ?? Math.random;
    for (let attempt = 0; ; attempt++) {
      const canRetry = safeToRepeat && attempt < policy.retries;
      let response: Response;
      try {
        response = await this.fetchImpl(url, init);
      } catch (error) {
        if (canRetry && isNetworkError(error)) {
          await sleep(backoff(policy, attempt, random));
          continue;
        }
        throw error;
      }
      if (response.ok) {
        return response;
      }
      const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
      if (canRetry && RETRYABLE_STATUS.has(response.status)) {
        // A 429 without Retry-After is usually a daily quota: waiting seconds will not help.
        const waitable = response.status !== 429 || (retryAfter !== undefined && retryAfter <= policy.maxRetryAfterMs);
        if (waitable) {
          await sleep(retryAfter ?? backoff(policy, attempt, random));
          continue;
        }
      }
      throw await parseError(response.clone());
    }
  }

  /** @internal Opens a long-lived streaming response (Server-Sent Events). */
  async openStream(path: string, query: Record<string, string | undefined>, signal?: AbortSignal): Promise<Response> {
    const url = buildURL(this.endpoint, path, query);
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: { ...this.baseHeaders, Accept: "text/event-stream" },
      signal,
    });
    if (!response.ok) {
      throw await parseError(response.clone());
    }
    return response;
  }

  /** Where the tenant stands against its plan: limits, usage and daily request counts. */
  async usage(days?: number): Promise<Usage> {
    return this.requestInternal<Usage>({
      method: "GET",
      path: "/api/usage",
      query: { days: days === undefined ? undefined : String(days) },
      parser: jsonParser,
    });
  }

  /** Checks the tenant's tamper-evident audit chain. */
  async verifyAudit(): Promise<AuditVerification> {
    return this.requestInternal<AuditVerification>({
      method: "GET",
      path: "/api/audit/verify",
      parser: jsonParser,
    });
  }

  /** Lists audit entries, newest first by default. */
  async audit(params: AuditQuery = {}): Promise<AuditEntry[]> {
    const query: Record<string, string | undefined> = {
      limit: params.limit === undefined ? undefined : String(params.limit),
      collection: params.collection,
      document_id: params.documentId,
      operation: params.operation,
      actor: params.actor,
      since: params.since instanceof Date ? params.since.toISOString() : params.since,
      until: params.until instanceof Date ? params.until.toISOString() : params.until,
      sort: params.sort,
    };
    const payload = await this.requestInternal<AuditEntry[] | { items: AuditEntry[] }>({
      method: "GET",
      path: "/api/audit",
      query,
      parser: jsonParser,
    });
    return Array.isArray(payload) ? payload : payload.items ?? [];
  }

  /** Snapshots (backups): create, list, restore, verify. */
  get snapshots(): SnapshotsClient {
    return new SnapshotsClient(this);
  }

  /** Webhook subscriptions, deliveries, secret rotation. Tenant-scoped key required. */
  get webhooks(): WebhooksClient {
    return new WebhooksClient(this);
  }

  /** Backup schedules. Tenant-scoped key required. */
  get schedules(): SchedulesClient {
    return new SchedulesClient(this);
  }

  /**
   * Run a report (tabular rows, aggregates, group-by, distinct). The server
   * supports reports on PostgreSQL only and answers 400 elsewhere.
   */
  async report<Row = Record<string, any>>(request: ReportRequest): Promise<ReportResult<Row>> {
    return this.requestInternal<ReportResult<Row>>({
      method: "POST",
      path: "/api/query",
      body: request,
      parser: jsonParser,
    });
  }

  /**
   * Upsert one record or a batch into `entity` through the schema-light ingest
   * path (records keyed by `external_id`). Pass an idempotency key to make a
   * retried call safe.
   */
  async ingest(entity: string, records: Record<string, any> | Record<string, any>[], write: WriteOptions = {}): Promise<IngestResult> {
    return this.requestInternal<IngestResult>({
      method: "POST",
      path: `/api/ingest/${seg(entity)}`,
      body: records,
      parser: jsonParser,
      idempotencyKey: write.idempotencyKey,
    });
  }

  async me(): Promise<Me> {
    const payload = await this.requestInternal<Me>({
      method: "GET",
      path: `/api/me`,

      parser: jsonParser,
    });
    return payload;
  }
}

export class CollectionClient<
  T extends Record<string, any> = Record<string, any>
> {
  constructor(
    private readonly client: TinyDB,
    public readonly name: string,
    private metadata: CollectionDetails
  ) {}

  get details(): CollectionDetails {
    return this.metadata;
  }

  schema(definition: CollectionSchemaDefinition): CollectionBuilder<T> {
    return new CollectionBuilder<T>(this.client, this.name, (meta) => {
      this.metadata = meta;
    }).schema(definition);
  }

  primary_key(config: PrimaryKeyConfig): CollectionBuilder<T> {
    return new CollectionBuilder<T>(this.client, this.name, (meta) => {
      this.metadata = meta;
    }).primary_key(config);
  }

  async refresh(): Promise<CollectionDetails> {
    this.metadata = await this.client.describeCollection(this.name);
    return this.metadata;
  }

  async list(options: ListOptions = {}): Promise<ListResult<T>> {
    const query: Record<string, string | undefined> = {};
    if (options.limit !== undefined) {
      query.limit = toQueryValue(options.limit);
    }
    if (options.offset !== undefined) {
      query.offset = toQueryValue(options.offset);
    }
    if (options.includeDeleted) {
      query.include_deleted = "true";
    }
    if (options.select && options.select.length > 0) {
      query.select = options.select.join(",");
    }
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query[`f.${key}`] = toQueryValue(value);
      }
    }
    const response = await this.client.requestInternal<{
      items: DocumentPayload[];
      pagination: Pagination;
    }>({
      method: "GET",
      path: `/api/collections/${encodeURIComponent(this.name)}/documents`,
      query,
      parser: jsonParser,
    });
    return {
      items: (response.items ?? []).map((item: DocumentPayload) =>
        parseDocument<T>(item)
      ),
      pagination: response.pagination ?? {},
    };
  }

  async get(
    id: string,
    options?: { pk?: boolean }
  ): Promise<DocumentRecord<T>> {
    if (options?.pk) {
      return this.getByPk(id);
    }
    const payload = await this.client.requestInternal<DocumentPayload>({
      method: "GET",
      path: `/api/collections/${encodeURIComponent(
        this.name
      )}/documents/${encodeURIComponent(id)}`,
      parser: jsonParser,
    });
    return parseDocument<T>(payload);
  }

  async getByPk(key: string): Promise<DocumentRecord<T>> {
    const payload = await this.client.requestInternal<DocumentPayload>({
      method: "GET",
      path: `/api/collections/${encodeURIComponent(
        this.name
      )}/documents/primary/${encodeURIComponent(key)}`,
      parser: jsonParser,
    });
    return parseDocument<T>(payload);
  }

  async create(doc: Record<string, any>, options?: WriteOptions): Promise<DocumentRecord<T>>;
  async create(docs: Record<string, any>[], options?: WriteOptions): Promise<DocumentRecord<T>[]>;
  async create(
    docOrDocs: Record<string, any> | Record<string, any>[],
    options: WriteOptions = {}
  ): Promise<DocumentRecord<T> | DocumentRecord<T>[]> {
    if (Array.isArray(docOrDocs)) {
      if (docOrDocs.length === 0) {
        return [];
      }
      const response = await this.client.requestInternal<{
        items: DocumentPayload[];
      }>({
        method: "POST",
        path: `/api/collections/${encodeURIComponent(
          this.name
        )}/documents/bulk`,
        body: docOrDocs,
        parser: jsonParser,
        allowOfflineQueue: true,
        idempotencyKey: options.idempotencyKey,
      });
      const items = response?.items ?? [];
      return items.map((item) => parseDocument<T>(item));
    }
    const payload = await this.client.requestInternal<DocumentPayload>({
      method: "POST",
      path: `/api/collections/${encodeURIComponent(this.name)}/documents`,
      body: docOrDocs,
      parser: jsonParser,
      allowOfflineQueue: true,
      idempotencyKey: options.idempotencyKey,
    });
    return parseDocument<T>(payload);
  }

  async update(
    id: string,
    doc: Record<string, any>
  ): Promise<DocumentRecord<T>> {
    const payload = await this.client.requestInternal<DocumentPayload>({
      method: "PUT",
      path: `/api/collections/${encodeURIComponent(
        this.name
      )}/documents/${encodeURIComponent(id)}`,
      body: doc,
      parser: jsonParser,
      allowOfflineQueue: true,
    });
    return parseDocument<T>(payload);
  }

  async patch(
    id: string,
    doc: Record<string, any>
  ): Promise<DocumentRecord<T>> {
    const payload = await this.client.requestInternal<DocumentPayload>({
      method: "PATCH",
      path: `/api/collections/${encodeURIComponent(
        this.name
      )}/documents/${encodeURIComponent(id)}`,
      body: doc,
      parser: jsonParser,
      allowOfflineQueue: true,
    });
    return parseDocument<T>(payload);
  }

  async delete(id: string | string[]): Promise<void> {
    if (Array.isArray(id)) {
      for (const docId of id) {
        await this.delete(docId);
      }
      return;
    }
    await this.client.requestInternal<void>({
      method: "DELETE",
      path: `/api/collections/${encodeURIComponent(
        this.name
      )}/documents/${encodeURIComponent(id)}`,
      parser: async () => undefined,
      allowOfflineQueue: true,
    });
  }

  async purge(id: string | string[]): Promise<void> {
    if (Array.isArray(id)) {
      for (const docId of id) {
        await this.purge(docId);
      }
      return;
    }
    await this.client.requestInternal<void>({
      method: "DELETE",
      path: `/api/collections/${encodeURIComponent(
        this.name
      )}/documents/${encodeURIComponent(id)}/purge`,
      query: { confirm: "true" },
      parser: async () => undefined,
      allowOfflineQueue: true,
    });
  }

  async query(request: QueryRequest): Promise<QueryResult<T>> {
    const response = await this.client.requestInternal<{
      items: DocumentPayload[];
      pagination: Pagination;
    }>({
      method: "POST",
      path: `/api/collections/${encodeURIComponent(this.name)}/query`,
      body: request,
      parser: jsonParser,
    });
    return {
      items: (response.items ?? []).map((item: DocumentPayload) =>
        parseDocument<T>(item)
      ),
      pagination: response.pagination ?? {},
    };
  }

  async sync(params: SyncParams = {}): Promise<SyncResult<T>> {
    const query: Record<string, string | undefined> = {};
    if (params.limit !== undefined) {
      query.limit = toQueryValue(params.limit);
    }
    if (params.cursor) {
      query.cursor = params.cursor;
    }
    if (params.includeDeleted !== undefined) {
      query.include_deleted = params.includeDeleted ? "true" : "false";
    }
    if (params.since) {
      query.since =
        params.since instanceof Date
          ? params.since.toISOString()
          : params.since;
    }
    const response = await this.client.requestInternal<{
      items: {
        document: DocumentPayload;
        change_type: "upsert" | "delete";
      }[];
      pagination: Pagination;
      since?: string;
    }>({
      method: "GET",
      path: `/api/collections/${encodeURIComponent(this.name)}/sync`,
      query,
      parser: jsonParser,
    });
    return {
      items: (response.items ?? []).map(
        (item: {
          document: DocumentPayload;
          change_type: "upsert" | "delete";
        }) => ({
          change_type: item.change_type,
          document: parseDocument<T>(item.document),
        })
      ),
      pagination: response.pagination ?? {},
      since: response.since,
    };
  }

  /**
   * Iterates every document of the collection, fetching `pageSize` at a time.
   * Stops cleanly at the end; break out of the loop to stop early.
   */
  async *iterate(options: Omit<ListOptions, "limit" | "offset"> & { pageSize?: number } = {}): AsyncGenerator<DocumentRecord<T>> {
    const pageSize = options.pageSize ?? 200;
    let offset = 0;
    for (;;) {
      const page = await this.list({ ...options, limit: pageSize, offset });
      for (const item of page.items) {
        yield item;
      }
      offset += page.items.length;
      const total = page.pagination.count;
      if (page.items.length < pageSize || (total !== undefined && offset >= total)) {
        return;
      }
    }
  }

  /** Iterates every result of a DSL query, following cursors (or offsets when the server returns none). */
  async *queryAll(request: Omit<QueryRequest, "cursor" | "offset"> & { pageSize?: number }): AsyncGenerator<DocumentRecord<T>> {
    const { pageSize = 200, ...rest } = request;
    let cursor: string | undefined;
    let offset = 0;
    for (;;) {
      const page = await this.query({ ...rest, limit: pageSize, ...(cursor ? { cursor } : { offset }) });
      for (const item of page.items) {
        yield item;
      }
      offset += page.items.length;
      cursor = page.pagination.next_cursor;
      if (page.items.length < pageSize && !cursor) {
        return;
      }
      if (page.items.length === 0 || (page.pagination.has_more === false && !cursor)) {
        return;
      }
    }
  }

  /** Iterates every change since `params.since`, following the sync cursor. */
  async *syncAll(params: Omit<SyncParams, "cursor"> = {}): AsyncGenerator<SyncChange<T>> {
    let cursor: string | undefined;
    for (;;) {
      const page = await this.sync({ ...params, cursor });
      for (const change of page.items) {
        yield change;
      }
      cursor = page.pagination.next_cursor;
      if (!page.pagination.has_more || !cursor) {
        return;
      }
    }
  }

  /**
   * Streams changes to this collection (Server-Sent Events). If the connection
   * drops it reconnects and resumes after the last `seq` delivered, so no change
   * recorded in between is missed. A `lagged` event means this consumer fell
   * behind; the missed changes follow it. Stop with `options.signal` or by
   * breaking out of the loop.
   *
   * Events replayed after a resume do not carry `key`/`key_numeric`.
   */
  async *watch(options: WatchOptions = {}): AsyncGenerator<ChangeEvent> {
    const reconnect = options.reconnect ?? true;
    let since = options.since;
    for (;;) {
      if (options.signal?.aborted) return;
      try {
        const response = await this.client.openStream(
          "/events",
          { collection: this.name, since: since === undefined ? undefined : String(since) },
          options.signal
        );
        for await (const event of parseSSE(response)) {
          if (event.seq !== undefined && (since === undefined || event.seq > since)) {
            since = event.seq;
          }
          yield event;
        }
      } catch (error) {
        if (options.signal?.aborted) return;
        // An HTTP error (auth, unknown collection) will not fix itself by retrying.
        if (error instanceof TinyDBError || !reconnect) throw error;
      }
      if (!reconnect || options.signal?.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, options.reconnectDelayMs ?? 1000));
    }
  }

  async schemaJson(): Promise<any> {
    const response = await this.client.requestInternal<{ schema: any }>({
      method: "GET",
      path: `/api/collections/${encodeURIComponent(this.name)}/schema`,
      parser: jsonParser,
    });
    return response.schema;
  }
}

/** Parses a text/event-stream body into change events. Comments and pings are skipped. */
async function* parseSSE(response: Response): AsyncGenerator<ChangeEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, "");
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) {
          yield JSON.parse(data) as ChangeEvent;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export { CollectionBuilder };
