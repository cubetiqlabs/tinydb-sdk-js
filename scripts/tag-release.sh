#!/bin/bash

# Script to create a git tag from package.json version and push to origin
# Tag format: v{version} (e.g., v1.0.0)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if package.json exists
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo -e "${RED}Error: package.json not found at $PROJECT_DIR/package.json${NC}"
  exit 1
fi

# Extract version from package.json
VERSION=$(node -p "require('$PROJECT_DIR/package.json').version" 2>/dev/null || true)

if [ -z "$VERSION" ]; then
  echo -e "${RED}Error: Could not extract version from package.json${NC}"
  exit 1
fi

TAG="v$VERSION"

# Check if tag already exists locally
TAG_EXISTS_LOCAL=false
if git -C "$PROJECT_DIR" rev-parse "$TAG" >/dev/null 2>&1; then
  TAG_EXISTS_LOCAL=true
fi

# Get current branch
CURRENT_BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)

# Display information
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Git Tag Release Information      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Project:${NC}        $PROJECT_DIR"
echo -e "${GREEN}Version:${NC}        $VERSION"
echo -e "${GREEN}Tag:${NC}            $TAG"
echo -e "${GREEN}Branch:${NC}         $CURRENT_BRANCH"

if [ "$TAG_EXISTS_LOCAL" = true ]; then
  echo -e "${YELLOW}Status:${NC}         Tag exists locally (will be recreated)"
fi

echo ""

# Get latest commit info
LATEST_COMMIT=$(git -C "$PROJECT_DIR" log -1 --pretty=format:"%h - %s (%an)")
echo -e "${GREEN}Latest Commit:${NC}   $LATEST_COMMIT"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will:${NC}"
echo "  1. Run lint, test, and build"
echo "  2. Create/recreate tag '$TAG' on the current commit"
echo "  3. Delete tag from remote if it exists"
echo "  4. Push the tag to 'origin' remote"
echo ""

read -p "Do you want to proceed? (yes/no): " -r CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${RED}Cancelled.${NC}"
  exit 0
fi

# Run linting
echo ""
echo -e "${BLUE}Checking code quality (lint)...${NC}"
cd "$PROJECT_DIR"
if ! npm run lint; then
  echo -e "${RED}✗ Lint errors found!${NC}"
  echo "Please fix linting errors before releasing."
  exit 1
fi
echo -e "${GREEN}✓ Lint passed${NC}"

# Run tests
echo ""
echo -e "${BLUE}Running tests...${NC}"
cd "$PROJECT_DIR"
if ! npm test --silent; then
  echo -e "${RED}✗ Tests failed!${NC}"
  echo "Please fix the failing tests before releasing."
  exit 1
fi
echo -e "${GREEN}✓ Tests passed${NC}"

# Run build
echo ""
echo -e "${BLUE}Building project...${NC}"
if ! npm run build; then
  echo -e "${RED}✗ Build failed!${NC}"
  echo "Please fix the build errors before releasing."
  exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

# Create or recreate the tag with --force
echo ""
echo -e "${BLUE}Creating tag '$TAG'...${NC}"
git -C "$PROJECT_DIR" tag -a "$TAG" -m "Release $VERSION" --force

if [ $? -eq 0 ]; then
  if [ "$TAG_EXISTS_LOCAL" = true ]; then
    echo -e "${GREEN}✓ Tag recreated successfully${NC}"
  else
    echo -e "${GREEN}✓ Tag created successfully${NC}"
  fi
else
  echo -e "${RED}✗ Failed to create tag${NC}"
  exit 1
fi

# Show tag info
echo ""
echo -e "${BLUE}Tag details:${NC}"
git -C "$PROJECT_DIR" tag -l -n3 "$TAG"

# Confirmation to push
echo ""
echo -e "${YELLOW}Ready to push to origin...${NC}"
read -p "Do you want to push tag to origin? (yes/no): " -r PUSH_CONFIRM

if [[ ! "$PUSH_CONFIRM" =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${RED}Push cancelled.${NC}"
  echo -e "${YELLOW}Note:${NC} The tag '$TAG' has been created locally but not pushed."
  echo "To push later, run: git push origin $TAG --force"
  exit 0
fi

# Delete remote tag if it exists
echo ""
echo -e "${BLUE}Checking remote for existing tag...${NC}"
if git -C "$PROJECT_DIR" ls-remote --tags origin "$TAG" 2>/dev/null | grep -q "^"; then
  echo -e "${BLUE}Deleting existing tag from remote...${NC}"
  git -C "$PROJECT_DIR" push origin --delete "$TAG" 2>/dev/null || true
  echo -e "${GREEN}✓ Remote tag deleted${NC}"
fi

# Push the tag with force flag
echo ""
echo -e "${BLUE}Pushing tag to origin...${NC}"
git -C "$PROJECT_DIR" push origin "$TAG" --force

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Tag pushed successfully to origin${NC}"
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║        Release Published! 🎉           ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo "Tag '$TAG' has been created and pushed to origin."
  echo "The GitHub Actions workflow will now build and publish to npm."
  echo ""
else
  echo -e "${RED}✗ Failed to push tag to origin${NC}"
  echo -e "${YELLOW}Tip:${NC} The tag was created locally. Push it manually with:"
  echo "  git push origin $TAG --force"
  exit 1
fi
