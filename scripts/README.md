# Scripts Testing

This directory contains utility scripts for the LogicAppsUX project and their corresponding tests.

## Shared Utilities

### version-utils.ts

A shared utility module containing common version management functions used by both `calculate-next-version.ts` and `get-current-version.ts`:

- `getPackageVersion()` - Reads version from package.json
- `getLatestVersionFromTags()` - Gets the latest version tag from git
- `getLatestPatchTag()` - Gets the latest patch tag for a specific major.minor version
- `parseHotfixBranch()` - Parses hotfix branch names to extract version info
- `sortVersionTags()` - Sorts version tags in ascending order
- `outputForGitHub()` - Outputs version information for GitHub Actions

## calculate-next-version.ts

A TypeScript script that calculates the next semantic version based on release type and branch context. This script replaces the complex bash logic previously used in the GitHub Actions workflow.

### Usage

```bash
# Run with tsx
npx tsx calculate-next-version.ts <release_type> <branch_name>

# Examples
npx tsx calculate-next-version.ts minor main
npx tsx calculate-next-version.ts patch hotfix/v5.109
npx tsx calculate-next-version.ts major main
```

### Parameters

- `release_type`: `major` | `minor` | `patch` (default: `minor`)
- `branch_name`: Git branch name (default: `main`)

### Logic

- **Minor releases**: Increment minor version, reset patch to 0
- **Major releases**: Increment major version, reset minor and patch to 0  
- **Patch releases**: 
  - On hotfix branches (`hotfix/v5.109`): Extract target version from branch name
  - On other branches: Use current package.json major.minor
  - Find latest existing patch tag and increment by 1
  - If no existing tags found, start at patch 1

### Output

The script outputs version information to console and sets GitHub Actions outputs:
- `new_version`: The calculated next version (e.g., `5.111.0`)
- `tag_name`: The git tag name (e.g., `v5.111.0`)

## Testing

### Run All Tests

```bash
# Quick way
./scripts/test-version-script.sh

# Manual way
cd scripts && npx vitest run
```

### Test Types

#### Unit Tests (`__test__/calculate-next-version.spec.ts`)

Comprehensive unit tests with mocked dependencies:

- ✅ **Minor releases**: Version increment logic
- ✅ **Major releases**: Version increment logic
- ✅ **Patch releases**: 
  - Non-hotfix branches using package.json version
  - Hotfix branches extracting version from branch name
  - Git tag parsing and sorting
  - Edge cases (no tags, git errors, malformed input)
- ✅ **Version tag sorting**: Semantic version ordering
- ✅ **Hotfix branch parsing**: Various branch name formats
- ✅ **Error handling**: Graceful failure scenarios

#### Integration Tests (`__test__/integration.spec.ts`)

End-to-end tests that actually execute the script:

- ✅ **CLI execution**: Full script execution via `npx tsx`
- ✅ **Output format**: Validates console output and GitHub Actions format
- ✅ **Different scenarios**: Minor, major, patch releases
- ✅ **Default parameters**: Behavior when no args provided

### Test Commands

```bash
# Run all tests
cd scripts && npx vitest run

# Run tests in watch mode  
cd scripts && npx vitest

# Run specific test file
cd scripts && npx vitest run __test__/calculate-next-version.spec.ts

# Run with coverage
cd scripts && npx vitest run --coverage

# Run integration tests only
cd scripts && npx vitest run __test__/integration.spec.ts
```

### Test Coverage

The test suite covers:

- **Happy paths**: All release types with various starting versions
- **Edge cases**: Error conditions, malformed input, missing files
- **Git integration**: Tag parsing, sorting, branch detection
- **GitHub Actions**: Output format validation
- **CLI interface**: Argument parsing, default values

## Files

- `calculate-next-version.ts` - Main version calculation script
- `vitest.config.ts` - Vitest configuration for scripts directory
- `test-version-script.sh` - Convenient test runner script
- `__test__/calculate-next-version.spec.ts` - Unit tests with mocks
- `__test__/integration.spec.ts` - Integration tests (actual execution)
- `README.md` - This documentation

## GitHub Actions Integration

The script is used in `.github/workflows/version-release.yml`:

```yaml
- name: 'Calculate Next Version'
  id: version
  run: |
    npx tsx scripts/calculate-next-version.ts "${{ github.event.inputs.release_type || 'minor' }}" "${{ github.ref_name }}"
```

This replaces a previous 74-line bash script with a single line, while maintaining all functionality and adding comprehensive test coverage.