# Changelog

All notable changes to the TinyDB TypeScript Client SDK are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-20

### Added

- **Initial Release** - Complete TypeScript/JavaScript SDK for TinyDB
- **Collection Management**
  - Create, retrieve, and manage collections
  - Schema definition with field validation
  - Automatic collection creation on first access

- **Document Operations**
  - Create single and batch documents
  - Get document by ID or primary key
  - Update documents (full replacement)
  - Delete single and multiple documents
  - Permanent purge operations

- **Querying**
  - Comprehensive query DSL with filtering
  - Support for operators: eq, neq, lt, lte, gt, gte, contains, startsWith, endsWith, in, notIn, exists, isNull, notNull
  - AND/OR logical operators
  - Custom field selection/projection
  - Multi-field sorting (ascending/descending)
  - Offset-based pagination
  - Cursor-based pagination for stable pagination

- **Synchronization**
  - Incremental sync with date-based queries
  - Cursor-based sync for large datasets
  - Real-time subscription to collection changes via WebSocket
  - Support for change_type indicators (upsert, delete)

- **Offline Support**
  - Offline mode with operation queuing
  - Automatic retry of queued operations
  - Manual queue flushing via `flushOfflineQueue()`
  - OfflineError with operation details

- **Error Handling**
  - TinyDBError with status codes and error details
  - OfflineError for queued operations
  - Detailed validation error reporting
  - Graceful error recovery

- **Type Safety**
  - Full TypeScript support with generics
  - Type definitions for all APIs and data structures
  - Strict mode compilation

- **Performance**
  - ESM (14.94 KB) and CJS (16.07 KB) bundles
  - Efficient field selection to reduce data transfer
  - Cursor-based pagination for scalable sync

- **Documentation**
  - Comprehensive API Reference (docs/API_REFERENCE.md)
  - 50+ practical code examples (docs/API_EXAMPLES.md)
  - Quick start guide in README
  - Development guidelines in AGENTS.md

- **Release Infrastructure**
  - Automated release script with quality gates
  - npm provenance attestation for supply chain security
  - Two-stage confirmation to prevent accidents
  - GitHub Actions workflow for automated publishing
  - Comprehensive pre-flight checks (lint, test, build)

### Features

#### Core Client
- `TinyDB` class for database access
- `CollectionBuilder` for fluent API
- `Collection<T>` for type-safe operations
- Support for custom fetch implementations

#### Document Types
- `DocumentRecord<T>` - Document with metadata
- `DocumentData<T>` - Type-safe document data
- `Pagination` - Pagination metadata
- Multiple field types: string, number, boolean, uuid, date, datetime, object, array

#### Query Capabilities
- Complex filtering with nested conditions
- String operations (startsWith, endsWith, contains)
- Numeric comparisons (lt, lte, gt, gte)
- Array operations (contains, in, notIn)
- Null checking (isNull, notNull, exists)
- Flexible sorting by multiple fields
- Result limiting and pagination

#### Offline Capabilities
- Transparent operation queuing
- Connection status handling
- Automatic retry mechanisms
- Queue flushing on demand

### Breaking Changes

None - Initial release.

### Known Limitations

- No GraphQL support (planned)
- No real-time subscriptions via gRPC (WebSocket only)
- Collection listing not yet available
- Single fetch operation per query (no streaming)

### Security

- ✅ npm provenance attestation enabled
- ✅ Supply chain security via GitHub Actions
- ✅ Type safety with TypeScript strict mode
- ✅ Input validation on document operations

### Testing

- ✅ 7 comprehensive unit tests covering:
  - Collection creation with schema
  - Document lifecycle (create, get, update, delete)
  - Bulk operations
  - Query execution
  - Offline queuing
  - Incremental sync
  - Error handling

- ✅ 100% test pass rate
- ✅ Coverage for all major features

### Quality Metrics

- TypeScript: Strict mode enabled
- Bundle: ESM (14.94 KB) + CJS (16.07 KB)
- Definitions: 6.99 KB
- Test coverage: 7/7 tests passing
- Pre-flight checks: Lint ✅ Test ✅ Build ✅

### Dependencies

- No runtime dependencies (uses native Fetch API)
- Dev dependencies: TypeScript, Vitest, tsup

---

## Unreleased

### Planned Features

- [ ] GraphQL API support
- [ ] Real-time gRPC streaming
- [ ] Collection listing API
- [ ] Advanced filtering operators
- [ ] Aggregation support
- [ ] Full-text search
- [ ] Batch export functionality
- [ ] Middleware system for requests/responses
- [ ] Request/response interceptors
- [ ] Built-in caching layer
- [ ] React hooks integration
- [ ] Vue composables
- [ ] Python SDK
- [ ] Go SDK documentation

### Future Improvements

- Performance optimization for large datasets
- Better offline conflict resolution
- Subscription filtering
- Connection pooling
- Request batching optimization
- Memory usage optimization
- Better error messages with recovery hints

---

## How to Release

To release a new version:

1. Update version in `package.json`
2. Update this `CHANGELOG.md` with new section
3. Commit changes
4. Run `npm run release`
5. Follow interactive prompts
6. GitHub Actions automatically publishes to npm

All releases include:
- ✅ Pre-flight quality checks (lint, test, build)
- ✅ Git tag in semantic version format (v0.1.0)
- ✅ npm provenance attestation
- ✅ GitHub Release with changelog
- ✅ Automated release notes

See [Release Script Details](../scripts/TAG-RELEASE.md) for more information.

---

## Migration Guide

### From Pre-Release Versions

This is the first released version (0.1.0). No migration needed.

---

## Credits

Built with ❤️ by the CUBIS Labs team.

---

## License

MIT © CUBIS Labs
