# Tag Release Script

This script automates the process of creating a git tag from the `package.json` version and pushing it to the origin remote.

## Usage

```bash
./scripts/tag-release.sh
```

## What it does

1. **Checks code quality** via TypeScript lint
2. **Runs all tests** to ensure code quality
3. **Builds the project** locally to catch errors early
4. **Reads version** from `package.json`
5. **Creates a tag** with format `v{version}` (e.g., `v1.0.0`)
6. **Validates** the tag doesn't already exist
7. **Shows** release information and current branch
8. **Prompts for confirmation** before creating the tag
9. **Prompts for confirmation** before pushing to origin
10. **Triggers GitHub Actions** publish workflow when pushed

## Features

✅ Lint check before release (TypeScript checking)  
✅ Automated test suite execution  
✅ Local build verification  
✅ Automatic version extraction from `package.json`  
✅ Prevents duplicate tags  
✅ Shows tag details before pushing  
✅ Two-stage confirmation (create & push)  
✅ Colored output for clarity  
✅ Works from any directory  
✅ Handles errors gracefully  

## Example Output

### Step 1: Pre-Flight Quality Checks (Automatic)

```
🔍 Running pre-flight checks...

✅ Checking code quality (lint)...
   ✓ No TypeScript errors
   ✓ ESLint passed

✅ Running tests...
   ✓ 42 tests passed
   ✓ Coverage: 95%

✅ Building project...
   ✓ Bundle generated: dist/index.js (12 KB)
   ✓ TypeScript declaration files ready

📋 All quality checks passed! Ready for release.
```

### Step 2: Release Confirmation

```
╔════════════════════════════════════════╗
║        Git Tag Release Information      ║
╚════════════════════════════════════════╝

Project:        /Users/cubetiq/projects/tinydb/clients/tinydb-sdk-js
Version:        1.0.0
Tag:            v1.0.0
Branch:         main

Latest Commit:   abc1234 - Release v1.0.0 (John Doe)

✅ Quality Checks: PASSED
   • Lint:  ✓
   • Test:  ✓
   • Build: ✓

⚠️  This will:
  1. Create a tag 'v1.0.0' on the current commit
  2. Push the tag to 'origin' remote
  3. Trigger GitHub Actions publish workflow
  4. Publish to npm with provenance attestation

Do you want to proceed? (yes/no): yes
```

### Step 3: Tag Creation & Push

```
✅ Creating annotated tag 'v1.0.0'...
✅ Tag created successfully!

📝 Tag Details:
   Tag: v1.0.0
   Author: Your Name <you@example.com>
   Date: 2025-01-20 14:30:45
   Message: Release v1.0.0

Ready to push to origin? This will trigger npm publishing. (yes/no): yes

✅ Pushing tag to origin...
✅ Tag pushed successfully!

🚀 Release initiated! 
   Monitor progress: https://github.com/cubetiqlabs/tinydb/actions
   npm page: https://www.npmjs.com/package/@tinydb/client
```

## Prerequisites

- Git must be installed
- Node.js must be installed (for JSON parsing)
- You must have push access to the origin remote
- The `package.json` must contain a valid `version` field

## Publishing to npm

When you push a tag with this script:
1. GitHub detects the push tag `v*`
2. GitHub Actions workflow is triggered
3. Package is tested, built, and published to npm
4. GitHub Release is created automatically with changelog

## Troubleshooting

### Tag already exists
```
Error: Tag 'v1.0.0' already exists
```
The tag has already been created. Delete it and try again:
```bash
git tag -d v1.0.0
git push origin --delete v1.0.0
```

### Push failed
If the push fails, the tag is created locally. Push manually:
```bash
git push origin v1.0.0
```

### Version not found
Ensure `package.json` is valid JSON and has a `version` field:
```json
{
  "name": "my-package",
  "version": "1.0.0"
}
```
