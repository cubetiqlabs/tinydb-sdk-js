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
  return new TinyDBError(message, response.status, code, payload);
}

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
}

export class TinyDB {
  private readonly fetchImpl: FetchLike;
  private readonly endpoint: string;
  private readonly appId?: string;
  private readonly offlineMode: boolean;
  private readonly baseHeaders: Record<string, string>;
  private readonly offlineQueue: QueuedOperation[] = [];

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
    const init: RequestInit = {
      method: options.method,
      headers,
      body,
    };
    try {
      const response = await this.fetchImpl(url, init);
      if (!response.ok) {
        throw await parseError(response.clone());
      }
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

  async create(doc: Record<string, any>): Promise<DocumentRecord<T>>;
  async create(docs: Record<string, any>[]): Promise<DocumentRecord<T>[]>;
  async create(
    docOrDocs: Record<string, any> | Record<string, any>[]
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

  async schemaJson(): Promise<any> {
    const response = await this.client.requestInternal<{ schema: any }>({
      method: "GET",
      path: `/api/collections/${encodeURIComponent(this.name)}/schema`,
      parser: jsonParser,
    });
    return response.schema;
  }
}

export { CollectionBuilder };
