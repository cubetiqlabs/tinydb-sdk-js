# TinyDB TypeScript Client - API Examples

Complete, runnable examples for common TinyDB operations.

## Table of Contents

- [Setup & Initialization](#setup--initialization)
- [Collection Management](#collection-management)
- [Document CRUD](#document-crud)
- [Querying](#querying)
- [Pagination](#pagination)
- [Synchronization](#synchronization)
- [Real-Time Updates](#real-time-updates)
- [Offline Support](#offline-support)
- [Error Handling](#error-handling)

---

## Setup & Initialization

### Basic Setup

```typescript
import { TinyDB } from '@tinydb/client';

const db = new TinyDB({
    endpoint: 'https://api.tinydb.com',
    apiKey: process.env.TINYDB_API_KEY!,
});

// Get a collection
const users = await db.collection('users').sync();
```

### With Schema Definition

```typescript
const users = await db
    .collection('users')
    .schema({
        fields: {
            name: { 
                type: 'string', 
                required: true,
                description: 'User full name'
            },
            email: { 
                type: 'string', 
                required: true,
                description: 'User email address'
            },
            age: { 
                type: 'number',
                description: 'User age'
            },
            status: {
                type: 'string',
                enum: ['active', 'inactive', 'pending'],
                description: 'User status'
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'User tags'
            },
        },
        description: 'Application users'
    })
    .sync();
```

### With Offline Support

```typescript
const db = new TinyDB({
    endpoint: 'https://api.tinydb.com',
    apiKey: process.env.TINYDB_API_KEY!,
    offlineMode: true,  // Enable offline queue
});

const users = await db.collection('users').sync();
```

### With Custom Fetch (Node.js or Browsers)

```typescript
import fetch from 'node-fetch';

const db = new TinyDB({
    endpoint: 'https://api.tinydb.com',
    apiKey: process.env.TINYDB_API_KEY!,
    fetch: fetch as any,
});
```

---

## Collection Management

### Create a Collection

```typescript
const products = await db
    .collection('products')
    .schema({
        fields: {
            sku: { type: 'string', required: true },
            name: { type: 'string', required: true },
            price: { type: 'number', required: true },
            inStock: { type: 'boolean', required: true },
        },
    })
    .sync();

console.log('Collection created:', products.details.id);
console.log('Primary key:', products.details.primary_key_field);
```

### Get Existing Collection

```typescript
const collection = await db.collection('users').sync();
console.log('Collection name:', collection.details.name);
console.log('Created at:', collection.details.created_at);
console.log('Schema:', collection.details.schema);
```

### List Collections

```typescript
// Collections don't have a list endpoint yet
// You can track them in your application or create on-demand
```

---

## Document CRUD

### Create a Single Document

```typescript
const user = await users.create({
    name: 'Alice Johnson',
    email: 'alice@example.com',
    age: 28,
    status: 'active',
    tags: ['verified', 'premium']
});

console.log('Document created:', user.id);
console.log('Document data:', user.data);
console.log('Version:', user.version);
```

### Create Multiple Documents

```typescript
const newUsers = await users.create([
    {
        name: 'Bob Smith',
        email: 'bob@example.com',
        age: 35,
        status: 'active',
        tags: ['new']
    },
    {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        age: 42,
        status: 'pending',
        tags: ['trial']
    },
]);

console.log('Created documents:', newUsers.length);
newUsers.forEach(doc => {
    console.log(`- ${doc.data.name} (${doc.id})`);
});
```

### Get a Document

```typescript
// By document ID
const user = await users.get('doc-123');
console.log('User:', user.data.name);
console.log('Email:', user.data.email);

// By primary key (if configured)
const userByEmail = await users.get('alice@example.com', { pk: true });
console.log('Found user:', userByEmail.data.name);
```

### Update a Document

```typescript
const updated = await users.update('doc-123', {
    age: 29,
    status: 'inactive',
});

console.log('Updated version:', updated.version);
console.log('Updated at:', updated.updated_at);
```

### Delete Documents

```typescript
// Delete single document
await users.delete('doc-123');
console.log('Document deleted');

// Delete multiple documents
await users.delete(['doc-123', 'doc-456', 'doc-789']);
console.log('Multiple documents deleted');
```

### Purge a Document

```typescript
// Permanently delete (cannot be recovered)
await users.purge('doc-123');
console.log('Document permanently purged');
```

### Batch Operations

```typescript
// Create batch
const batch = [
    { name: 'User 1', email: 'user1@example.com', status: 'active' },
    { name: 'User 2', email: 'user2@example.com', status: 'pending' },
    { name: 'User 3', email: 'user3@example.com', status: 'active' },
];

const created = await users.create(batch);
console.log(`Created ${created.length} documents`);

// Delete batch
const ids = created.map(doc => doc.id);
await users.delete(ids);
console.log(`Deleted ${ids.length} documents`);
```

---

## Querying

### Simple Equality Query

```typescript
const activeUsers = await users.query({
    where: {
        and: [
            { status: { eq: 'active' } },
        ],
    },
});

console.log(`Found ${activeUsers.items.length} active users`);
activeUsers.items.forEach(doc => {
    console.log(`- ${doc.data.name}: ${doc.data.email}`);
});
```

### Multiple Conditions (AND)

```typescript
const results = await users.query({
    where: {
        and: [
            { status: { eq: 'active' } },
            { age: { gte: 18 } },
            { age: { lte: 65 } },
        ],
    },
});

console.log('Found:', results.items.length);
```

### OR Queries

```typescript
const vipUsers = await users.query({
    where: {
        or: [
            { status: { eq: 'premium' } },
            { tags: { contains: 'vip' } },
        ],
    },
});

console.log('VIP users:', vipUsers.items.length);
```

### String Operations

```typescript
// Starts with
const adminEmails = await users.query({
    where: {
        and: [
            { email: { startsWith: 'admin' } },
        ],
    },
});

// Ends with
const gmailUsers = await users.query({
    where: {
        and: [
            { email: { endsWith: '@gmail.com' } },
        ],
    },
});

// Contains
const johnUsers = await users.query({
    where: {
        and: [
            { name: { contains: 'John' } },
        ],
    },
});
```

### Array Operators

```typescript
// IN operator
const results = await users.query({
    where: {
        and: [
            { status: { in: ['active', 'pending'] } },
        ],
    },
});

// NOT IN operator
const results = await users.query({
    where: {
        and: [
            { status: { notIn: ['deleted', 'banned'] } },
        ],
    },
});

// Contains (array membership)
const premiumUsers = await users.query({
    where: {
        and: [
            { tags: { contains: 'premium' } },
        ],
    },
});
```

### Numeric Comparisons

```typescript
const adults = await users.query({
    where: {
        and: [
            { age: { gte: 18 } },
        ],
    },
});

const seniors = await users.query({
    where: {
        and: [
            { age: { gt: 65 } },
        ],
    },
});

const teens = await users.query({
    where: {
        and: [
            { age: { gte: 13 } },
            { age: { lt: 18 } },
        ],
    },
});
```

### Exists & Null Checks

```typescript
// Field exists
const usersWithAge = await users.query({
    where: {
        and: [
            { age: { exists: true } },
        ],
    },
});

// Field is null
const usersWithoutAge = await users.query({
    where: {
        and: [
            { age: { isNull: true } },
        ],
    },
});

// Field is not null
const usersWithAgeValue = await users.query({
    where: {
        and: [
            { age: { notNull: true } },
        ],
    },
});
```

### Sorting

```typescript
// Sort by name ascending
const sortedByName = await users.query({
    where: { and: [{ status: { eq: 'active' } }] },
    orderBy: [
        { field: 'name', direction: 'asc' },
    ],
    limit: 10,
});

// Sort by multiple fields
const sorted = await users.query({
    orderBy: [
        { field: 'status', direction: 'asc' },
        { field: 'name', direction: 'asc' },
    ],
    limit: 10,
});

// Sort descending
const newestFirst = await users.query({
    orderBy: [
        { field: 'created_at', direction: 'desc' },
    ],
    limit: 10,
});
```

### Select Specific Fields

```typescript
// Select only certain fields
const results = await users.query({
    where: { and: [{ status: { eq: 'active' } }] },
    select: ['name', 'email'],
    limit: 100,
});

results.items.forEach(doc => {
    // Only has name, email, and _doc_id
    console.log(doc.data.name, doc.data.email);
});
```

---

## Pagination

### Offset-Based Pagination

```typescript
const pageSize = 10;
let offset = 0;
let hasMore = true;

while (hasMore) {
    const result = await users.query({
        limit: pageSize,
        offset,
    });

    console.log(`Page with offset ${offset}:`);
    result.items.forEach(doc => {
        console.log(`- ${doc.data.name}`);
    });

    hasMore = result.pagination.has_more || false;
    offset += pageSize;
}
```

### Cursor-Based Pagination

```typescript
let cursor: string | undefined;
let pageNum = 1;

while (true) {
    const result = await users.query({
        limit: 25,
        cursor,
    });

    console.log(`Page ${pageNum}:`);
    result.items.forEach(doc => {
        console.log(`- ${doc.data.name}`);
    });

    if (!result.pagination.next_cursor) break;
    cursor = result.pagination.next_cursor;
    pageNum++;
}
```

### Limit Results

```typescript
// Get all results (up to safety cap)
const allResults = await users.query({
    limit: -1,  // -1 means get all
});

console.log(`Found ${allResults.items.length} documents`);
if (allResults.pagination.truncated) {
    console.log('Results were truncated at safety cap');
}
```

---

## Synchronization

### Incremental Sync

```typescript
// Get all changes since yesterday
const changes = await users.sync({
    since: new Date(Date.now() - 24 * 60 * 60 * 1000),
});

console.log(`Found ${changes.items.length} changes`);
changes.items.forEach(change => {
    if (change.change_type === 'upsert') {
        console.log(`Inserted/Updated: ${change.document.data.name}`);
    } else if (change.change_type === 'delete') {
        console.log(`Deleted: ${change.document.id}`);
    }
});
```

### Sync with Cursor

```typescript
let cursor: string | undefined;
const allChanges = [];

while (true) {
    const result = await users.sync({
        since: new Date('2025-01-01'),
        cursor,
        limit: 100,
    });

    allChanges.push(...result.items);

    if (!result.pagination.has_more) break;
    cursor = result.pagination.next_cursor;
}

console.log(`Total changes: ${allChanges.length}`);
```

### Sync from Date

```typescript
// Sync changes from specific date
const changes = await users.sync({
    since: new Date('2025-01-15T10:30:00Z'),
});

// Or from a timestamp string
const changes2 = await users.sync({
    since: '2025-01-15T10:30:00Z',
});
```

---

## Real-Time Updates

### Subscribe to Changes

```typescript
// Subscribe to collection changes
const unsubscribe = users.subscribe((change) => {
    console.log(`Change type: ${change.type}`);
    console.log(`Document: ${change.document.data.name}`);
    console.log(`Timestamp: ${change.timestamp}`);
});

// Later: unsubscribe
unsubscribe();
```

### Handle Different Change Types

```typescript
users.subscribe((change) => {
    switch (change.type) {
        case 'create':
            console.log('New user created:', change.document.data.name);
            // Update UI with new user
            break;

        case 'update':
            console.log('User updated:', change.document.data.name);
            // Refresh user data in UI
            break;

        case 'delete':
            console.log('User deleted:', change.document.id);
            // Remove user from UI
            break;
    }
});
```

### Multiple Subscriptions

```typescript
// Subscribe to multiple collections
const unsubUsers = users.subscribe((change) => {
    console.log('Users updated');
});

const unsubOrders = orders.subscribe((change) => {
    console.log('Orders updated');
});

// Cleanup
unsubUsers();
unsubOrders();
```

---

## Offline Support

### Offline Queue

```typescript
const db = new TinyDB({
    endpoint: 'https://api.tinydb.com',
    apiKey: process.env.TINYDB_API_KEY!,
    offlineMode: true,
});

const users = await db.collection('users').sync();

// This will queue if offline
try {
    await users.create({
        name: 'Alice',
        email: 'alice@example.com',
    });
} catch (error) {
    if (error instanceof OfflineError) {
        console.log('Operation queued for later');
        console.log('Will retry when connection restored');
    }
}
```

### Flush Offline Queue

```typescript
// Manually flush the queue
await db.flushOfflineQueue();
console.log('All queued operations have been processed');
```

### Check Offline Status

```typescript
try {
    await users.create({ name: 'Test' });
} catch (error) {
    if (error instanceof OfflineError) {
        console.log('Currently offline');
        console.log('Queued operation will be retried');
    } else if (error instanceof TinyDBError) {
        console.log('API error:', error.message);
    }
}
```

---

## Error Handling

### API Errors

```typescript
import { TinyDBError } from '@tinydb/client';

try {
    await users.create({
        name: 'Alice',
        // Missing required email
    });
} catch (error) {
    if (error instanceof TinyDBError) {
        console.error(`Error (${error.status}):`, error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'validation_failed') {
            console.error('Validation errors:', error.details);
        }
    }
}
```

### Network Errors

```typescript
try {
    const result = await users.query({
        where: { and: [{ status: { eq: 'active' } }] },
    });
} catch (error) {
    if (error instanceof OfflineError) {
        console.log('Network error - queued for later');
    } else {
        console.error('Unexpected error:', error);
    }
}
```

### Validation Errors

```typescript
try {
    await users.create({
        name: 'Alice',
        email: 'not-an-email',
        age: -5,
    });
} catch (error) {
    if (error instanceof TinyDBError && error.status === 400) {
        console.error('Validation failed:');
        error.details?.issues?.forEach((issue: any) => {
            console.error(`  ${issue.field}: ${issue.message}`);
        });
    }
}
```

### Comprehensive Error Handling

```typescript
async function safeCreate(data: any) {
    try {
        return await users.create(data);
    } catch (error) {
        if (error instanceof OfflineError) {
            console.log('📱 Offline - queued operation');
            return null;
        } else if (error instanceof TinyDBError) {
            if (error.status === 400) {
                console.error('❌ Validation error:', error.details);
            } else if (error.status === 401) {
                console.error('❌ Unauthorized - check API key');
            } else if (error.status === 409) {
                console.error('❌ Document already exists');
            } else {
                console.error(`❌ API error (${error.status}):`, error.message);
            }
            return null;
        } else if (error instanceof Error) {
            console.error('❌ Unexpected error:', error.message);
            return null;
        }
    }
}

const result = await safeCreate({
    name: 'Alice',
    email: 'alice@example.com',
});
```

---

## Advanced Examples

### Bulk Operations with Error Handling

```typescript
async function bulkImport(data: any[]) {
    const results = { success: 0, failed: 0, queued: 0 };

    for (const item of data) {
        try {
            await users.create(item);
            results.success++;
        } catch (error) {
            if (error instanceof OfflineError) {
                results.queued++;
            } else {
                results.failed++;
                console.error(`Failed to create user:`, error);
            }
        }
    }

    return results;
}
```

### Sync with Local Cache

```typescript
async function syncToLocal(lastSync: Date) {
    const changes = await users.sync({
        since: lastSync,
    });

    for (const change of changes.items) {
        if (change.change_type === 'upsert') {
            // Update local DB
            await localDB.users.upsert(change.document);
        } else {
            // Delete from local DB
            await localDB.users.delete(change.document.id);
        }
    }

    return new Date();
}
```

### Real-Time Sync

```typescript
const collection = await db.collection('users').sync();

// Subscribe to updates
collection.subscribe((change) => {
    console.log('Real-time update:', change.type);
    updateUI(change.document);
});

// Also check for older changes periodically
setInterval(async () => {
    const changes = await collection.sync({
        since: lastSyncTime,
    });
    
    for (const change of changes.items) {
        updateUI(change.document);
    }
    
    lastSyncTime = new Date();
}, 30000); // Every 30 seconds
```

---

## See Also

- [API Reference](API_REFERENCE.md) - Complete API documentation
- [README](../README.md) - Quick start guide
- [AGENTS.md](../AGENTS.md) - Development guidelines
