# TinyDB TypeScript Client - API Reference

## Overview

The TinyDB TypeScript Client SDK provides a type-safe interface for interacting with the TinyDB database service. It includes support for collection management, document CRUD operations, querying, real-time synchronization, and offline capabilities.

## Table of Contents

- [Client Initialization](#client-initialization)
- [Collections](#collections)
- [Documents](#documents)
- [Querying](#querying)
- [Synchronization](#synchronization)
- [Error Handling](#error-handling)
- [Types & Interfaces](#types--interfaces)

---

## Client Initialization

### TinyDB Class

Main entry point for interacting with TinyDB.

```typescript
class TinyDB {
    constructor(options: TinyDBOptions)
    collection(name: string): CollectionBuilder
    flushOfflineQueue(): Promise<void>
}
```

### TinyDBOptions

Configuration for TinyDB client initialization.

```typescript
interface TinyDBOptions {
    endpoint: string;              // TinyDB API endpoint URL
    apiKey: string;                // Authentication API key
    appId?: string;                // Optional application ID
    offlineMode?: boolean;         // Enable offline support (default: false)
    fetch?: FetchLike;             // Custom fetch implementation
}
```

### Example

```typescript
import { TinyDB } from '@tinydb/client';

const db = new TinyDB({
    endpoint: 'https://api.tinydb.com',
    apiKey: 'your-api-key',
    offlineMode: true,
});
```

---

## Collections

### CollectionBuilder

Fluent interface for collection operations with optional schema definition.

```typescript
class CollectionBuilder {
    schema(definition: CollectionSchemaDefinition): CollectionBuilder
    sync(): Promise<Collection>
}
```

### Collection

Provides access to collection operations (CRUD and querying).

```typescript
class Collection<T = Record<string, any>> {
    readonly details: CollectionDetails
    
    // Document operations
    create(data: T | T[]): Promise<DocumentRecord<T> | DocumentRecord<T>[]>
    get(id: string, options?: { pk?: boolean }): Promise<DocumentRecord<T>>
    update(id: string, data: Partial<T>): Promise<DocumentRecord<T>>
    delete(ids: string | string[]): Promise<void>
    purge(id: string): Promise<void>
    
    // Querying
    query(request: QueryRequest): Promise<QueryResult<T>>
    list(options?: ListOptions): Promise<ListResult<T>>
    
    // Synchronization
    sync(params?: SyncParams): Promise<SyncResult<T>>
    subscribe(callback: (change: ChangeEvent<T>) => void): () => void
}
```

### CollectionSchemaDefinition

Defines the structure and validation rules for collection documents.

```typescript
interface CollectionSchemaDefinition {
    fields: Record<string, CollectionFieldDefinition>;
    description?: string;
}

interface CollectionFieldDefinition {
    type: FieldType;
    required?: boolean;
    allowNull?: boolean;
    description?: string;
    enum?: string[];
    items?: CollectionFieldDefinition;
}

type FieldType = 
    | 'string'
    | 'number'
    | 'boolean'
    | 'uuid'
    | 'date'
    | 'datetime'
    | 'object'
    | 'array';
```

### CollectionDetails

Metadata about a collection.

```typescript
interface CollectionDetails {
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
```

### Example

```typescript
// Get or create a collection with schema
const users = await db
    .collection('users')
    .schema({
        fields: {
            name: { type: 'string', required: true },
            email: { type: 'string', required: true },
            age: { type: 'number' },
            active: { type: 'boolean', required: true },
        },
    })
    .sync();

// Get collection without schema
const orders = await db.collection('orders').sync();
```

---

## Documents

### DocumentRecord

A document instance with metadata.

```typescript
interface DocumentRecord<T = Record<string, any>> {
    id: string;                    // Unique document ID
    tenant_id: string;             // Tenant ID
    collection_id: string;         // Collection ID
    key: string;                   // Primary key value
    key_numeric?: number | null;   // Numeric key (if applicable)
    data: DocumentData<T>;         // Document data + _doc_id
    version: number;               // Document version
    created_at: string;            // ISO 8601 creation timestamp
    updated_at: string;            // ISO 8601 update timestamp
    deleted_at: string | null;     // ISO 8601 deletion timestamp (if deleted)
}

type DocumentData<T> = T & { _doc_id: string };
```

### Create

Insert one or multiple documents into a collection.

```typescript
// Single document
const user = await users.create({
    name: 'Alice',
    email: 'alice@example.com',
    active: true,
});

// Multiple documents
const batch = await users.create([
    { name: 'Bob', email: 'bob@example.com', active: true },
    { name: 'Charlie', email: 'charlie@example.com', active: false },
]);
```

### Get

Retrieve a document by ID or primary key.

```typescript
// Get by document ID
const doc = await users.get('doc-123');

// Get by primary key
const doc = await users.get('alice@example.com', { pk: true });
```

### Update

Update a document (full replacement).

```typescript
const updated = await users.update('doc-123', {
    name: 'Alice Updated',
    email: 'alice.new@example.com',
});
```

### Delete

Delete one or multiple documents.

```typescript
// Single document
await users.delete('doc-123');

// Multiple documents
await users.delete(['doc-123', 'doc-456']);
```

### Purge

Permanently delete a document (can't be recovered).

```typescript
await users.purge('doc-123');
```

---

## Querying

### QueryRequest

Defines a query with filtering, ordering, and pagination.

```typescript
interface QueryRequest {
    where?: WhereClause;           // Filtering conditions
    orderBy?: OrderClause[];       // Sort order
    limit?: number;                // Result limit
    offset?: number;               // Pagination offset
    select?: string[];             // Field selection
    cursor?: string;               // Cursor for pagination
}

interface WhereClause {
    and?: Condition[];             // AND conditions
    or?: Condition[];              // OR conditions
}

type Condition = Record<string, OperatorMap>;

type OperatorMap = {
    eq?: any;                      // Equals
    neq?: any;                     // Not equals
    lt?: any;                      // Less than
    lte?: any;                     // Less than or equal
    gt?: any;                      // Greater than
    gte?: any;                     // Greater than or equal
    contains?: any;                // Contains (string or array)
    startsWith?: any;              // String starts with
    endsWith?: any;                // String ends with
    in?: any[];                    // In array
    notIn?: any[];                 // Not in array
    exists?: boolean;              // Field exists
    isNull?: boolean;              // Field is null
    notNull?: boolean;             // Field is not null
};

interface OrderClause {
    field: string;                 // Field to sort by
    direction?: 'asc' | 'desc';   // Sort direction
}
```

### QueryResult

Results from a query.

```typescript
interface QueryResult<T = Record<string, any>> {
    items: DocumentRecord<T>[];
    pagination: Pagination;
}

interface Pagination {
    limit?: number;
    offset?: number;
    count?: number;
    next_cursor?: string;
    has_more?: boolean;
}
```

### Query Examples

```typescript
// Simple equality query
const activeUsers = await users.query({
    where: {
        and: [
            { active: { eq: true } },
        ],
    },
    limit: 10,
});

// Complex query with multiple conditions
const results = await users.query({
    where: {
        and: [
            { active: { eq: true } },
            { age: { gte: 18 } },
        ],
    },
    orderBy: [
        { field: 'name', direction: 'asc' },
    ],
    limit: 50,
    offset: 0,
});

// OR query
const results = await users.query({
    where: {
        or: [
            { status: { eq: 'premium' } },
            { totalSpent: { gte: 1000 } },
        ],
    },
});

// String operations
const results = await users.query({
    where: {
        and: [
            { email: { startsWith: 'admin' } },
        ],
    },
});

// In operator
const results = await users.query({
    where: {
        and: [
            { status: { in: ['active', 'pending'] } },
        ],
    },
});

// Cursor-based pagination
const firstPage = await users.query({
    limit: 25,
});

const nextPage = await users.query({
    limit: 25,
    cursor: firstPage.pagination.next_cursor,
});
```

### List

List documents with optional filtering and pagination.

```typescript
interface ListOptions {
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
    select?: string[];
    filters?: Record<string, string | number | boolean>;
}

// List first 100 documents
const result = await users.list({ limit: 100 });

// List with custom fields
const result = await users.list({
    limit: 50,
    select: ['name', 'email'],
});

// Include deleted documents
const result = await users.list({
    limit: 50,
    includeDeleted: true,
});
```

---

## Synchronization

### Sync

Retrieve changes since a specific point in time (incremental sync).

```typescript
interface SyncParams {
    since?: string | Date;         // Sync changes since this date
    cursor?: string;               // Resume from cursor
    limit?: number;                // Result limit
    includeDeleted?: boolean;      // Include deleted documents
}

interface SyncChange<T = Record<string, any>> {
    document: DocumentRecord<T>;
    change_type: 'upsert' | 'delete';
}

interface SyncResult<T = Record<string, any>> {
    items: SyncChange<T>[];
    pagination: Pagination;
    since?: string;
}
```

### Sync Example

```typescript
// Get changes since a specific date
const changes = await users.sync({
    since: new Date('2025-01-01'),
});

// Process changes
for (const change of changes.items) {
    if (change.change_type === 'upsert') {
        console.log('Updated:', change.document.data);
    } else if (change.change_type === 'delete') {
        console.log('Deleted:', change.document.id);
    }
}

// Cursor-based sync for large datasets
let cursor: string | undefined;
while (true) {
    const result = await users.sync({
        since: new Date('2025-01-01'),
        cursor,
        limit: 100,
    });

    for (const change of result.items) {
        // Process change
    }

    if (!result.pagination.has_more) break;
    cursor = result.pagination.next_cursor;
}
```

### Subscribe

Real-time subscription to collection changes (WebSocket).

```typescript
interface ChangeEvent<T = Record<string, any>> {
    type: 'create' | 'update' | 'delete';
    document: DocumentRecord<T>;
    timestamp: string;
}

const unsubscribe = users.subscribe((change) => {
    console.log(`Document ${change.type}:`, change.document);
});

// Later: unsubscribe from changes
unsubscribe();
```

---

## Error Handling

### TinyDBError

Represents API errors returned by TinyDB.

```typescript
class TinyDBError extends Error {
    readonly status: number;       // HTTP status code
    readonly code?: string;        // Error code
    readonly details?: any;        // Additional error details

    constructor(
        message: string,
        status: number,
        code?: string,
        details?: any
    )
}
```

### OfflineError

Thrown when an operation fails in offline mode and is queued for later retry.

```typescript
class OfflineError extends Error {
    readonly operation: any;       // The queued operation
}
```

### Error Examples

```typescript
try {
    await users.create({
        name: 'Alice',
        // Missing required email field
    });
} catch (error) {
    if (error instanceof TinyDBError) {
        console.error(`API Error (${error.status}):`, error.message);
        if (error.code === 'validation_failed') {
            console.error('Validation details:', error.details);
        }
    }
}

try {
    await users.create({ name: 'Bob', email: 'bob@example.com' });
} catch (error) {
    if (error instanceof OfflineError) {
        console.log('Queued for later:', error.operation);
        // Will be retried when connection is restored
    }
}
```

---

## Offline Support

When `offlineMode: true` is enabled, failed operations are automatically queued and retried when the connection is restored.

```typescript
const db = new TinyDB({
    endpoint: 'https://api.tinydb.com',
    apiKey: 'key',
    offlineMode: true,
});

// Operation fails offline → queued as OfflineError
try {
    await collection.create({ name: 'Alice' });
} catch (error) {
    if (error instanceof OfflineError) {
        console.log('Operation queued for later');
    }
}

// Later, manually flush queue or wait for auto-sync
await db.flushOfflineQueue();
```

---

## Types & Interfaces

### Summary of Main Types

| Type | Purpose |
|------|---------|
| `TinyDB` | Main client class |
| `Collection<T>` | Collection operations |
| `DocumentRecord<T>` | Document with metadata |
| `QueryRequest` | Query parameters |
| `SyncParams` | Sync parameters |
| `TinyDBError` | API errors |
| `OfflineError` | Offline queue errors |
| `FieldType` | Document field type |

### Field Types

```typescript
type FieldType =
    | 'string'      // Text data
    | 'number'      // Numeric data
    | 'boolean'     // True/false
    | 'uuid'        // UUID format
    | 'date'        // Date (YYYY-MM-DD)
    | 'datetime'    // ISO 8601 datetime
    | 'object'      // Nested object
    | 'array'       // Array of items
```

---

## Best Practices

1. **Always define schemas** for collections to enable validation
2. **Use TypeScript generics** for type-safe document operations
3. **Handle errors appropriately** - distinguish between validation, network, and API errors
4. **Use pagination** for large result sets (limit + offset or cursor)
5. **Enable offline mode** for resilient client applications
6. **Subscribe to changes** instead of polling for real-time updates
7. **Batch operations** when creating multiple documents
8. **Select specific fields** to reduce data transfer

---

## See Also

- [API Examples](API_EXAMPLES.md) - Practical usage examples
- [README](../README.md) - Quick start guide
- [AGENTS.md](../AGENTS.md) - Development guidelines
