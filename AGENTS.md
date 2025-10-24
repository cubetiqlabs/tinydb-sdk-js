# AGENTS.md

## Setup commands

-   Install deps: `npm install`
-   Run tests: `npm test`
-   Run lint: `npm run lint`
-   Build project: `npm run build`

## Code style

-   TypeScript strict mode
-   Single quotes, no semicolons
-   Use functional patterns where possible

## Release process

-   Run `npm run release`
-   Follow prompts to create & push git tag
-   GitHub Actions publishes to npm with provenance

## Must follow practices

-   All code must be reviewed before merging
-   Write tests for new features and bug fixes
-   Keep dependencies up to date
-   Every release must be added to `CHANGELOG.md` and add version tag, dated, with summary of changes (features, fixes, breaking changes)
-   `docs/API_REFERENCE.md` must be updated for any public API changes and API documentation must be accurate and up to date. Also update code examples into `docs/API_EXAMPLES.md` as needed.

## Prohibited actions

-   DO NOT CREATE ANY DOCUMENTATION FILES THAT ARE NOT LISTED IN THE "Related Documentation" SECTION BELOW WITHOUT PRIOR APPROVAL FROM THE TEAM.
-   DO NOT GENERATE ANY ADDITIONAL SCRIPTS OR TOOLS THAT ARE NOT PART OF THE RELEASE PROCESS WITHOUT PRIOR APPROVAL FROM THE TEAM.
-   DO NOT ADD ANY ADDITIONAL STEPS OR CHECKS TO THE RELEASE PROCESS WITHOUT PRIOR APPROVAL FROM THE TEAM.

## Security

-   Releases include npm provenance for supply chain security

## Related Documentation

-   [API Reference](docs/API_REFERENCE.md)
-   [API Examples](docs/API_EXAMPLES.md)
-   [Release Script Details](scripts/TAG-RELEASE.md)
-   [Change Log](CHANGELOG.md)
