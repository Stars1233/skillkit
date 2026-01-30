# Versioning

SkillKit uses **synchronized versioning** - all packages share the same version number.

## Package List

All these packages are kept in sync:

| Package | Location |
|---------|----------|
| `skillkit` | `apps/skillkit/` |
| `@skillkit/cli` | `packages/cli/` |
| `@skillkit/core` | `packages/core/` |
| `@skillkit/tui` | `packages/tui/` |
| `@skillkit/agents` | `packages/agents/` |
| `@skillkit/memory` | `packages/memory/` |
| `@skillkit/mesh` | `packages/mesh/` |
| `@skillkit/messaging` | `packages/messaging/` |
| `@skillkit/mcp-memory` | `packages/mcp-memory/` |
| `@skillkit/resources` | `packages/resources/` |
| `skillkit-docs` | `docs/fumadocs/` |
| Website | `docs/skillkit/` |

## How to Release

### 1. Bump Version

Use the version bump script:

```bash
./scripts/bump-version.sh 1.8.1
```

This updates all package.json files to the same version.

### 2. Commit Changes

```bash
git add -A
git commit -m "chore: bump version to 1.8.1"
git push origin main
```

### 3. Create Release

```bash
gh release create v1.8.1 --generate-notes
```

Or with custom notes:

```bash
gh release create v1.8.1 --title "v1.8.1 - Bug fixes" --notes "Release notes here"
```

### 4. Automated Publishing

When you push a tag starting with `v`, the CI automatically:

1. Verifies tag matches package versions
2. Runs tests
3. Publishes to npm
4. Publishes to GitHub Packages
5. Creates GitHub Release

## CI Checks

The CI validates version consistency on every PR:

- **version-check** job compares all package versions
- Fails if any package has a different version
- Run `./scripts/bump-version.sh <version>` to fix mismatches

## Semantic Versioning

We follow [semver](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, backward compatible

## Quick Commands

```bash
# Check current versions
grep -r '"version"' apps/skillkit/package.json

# Bump all packages
./scripts/bump-version.sh 1.8.1

# Create release
gh release create v1.8.1 --generate-notes
```
