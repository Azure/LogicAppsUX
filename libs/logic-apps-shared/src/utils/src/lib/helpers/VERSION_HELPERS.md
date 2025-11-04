# Version Helpers

Utilities for comparing semantic version strings (major.minor.patch).

## API

### `isVersionSupported(currentVersion, requiredVersion, exactMatch?)`

Checks if a current version meets the required version criteria.

**Parameters:**
- `currentVersion` (string): The current version to check (e.g., "1.115.0")
- `requiredVersion` (string): The required version to compare against (e.g., "1.114.22")
- `exactMatch` (boolean, optional): If true, requires exact version match. If false (default), allows current version to be equal or greater.

**Returns:** `boolean` - True if the version criteria is met.

**Throws:** `ArgumentException` if either version string is invalid.

**Examples:**

```typescript
import { isVersionSupported } from '@microsoft/logic-apps-shared';

// Check if current version is >= required version (default behavior)
isVersionSupported('1.115.0', '1.114.22'); // true
isVersionSupported('1.114.22', '1.114.22'); // true
isVersionSupported('1.114.21', '1.114.22'); // false

// Check for exact version match
isVersionSupported('1.114.22', '1.114.22', true); // true
isVersionSupported('1.114.23', '1.114.22', true); // false

// Error handling
try {
  isVersionSupported('invalid', '1.0.0');
} catch (error) {
  console.error(error.message); // "Invalid version format: ..."
}
```

### `isMultiVariableSupport(version?)` (deprecated)

Checks if the host version supports multiple variable operations (> 1.114.22).

**Note:** This function is deprecated. Use `isVersionSupported(version, "1.114.22") && version > "1.114.22"` instead.

**Parameters:**
- `version` (string | undefined): The host version string

**Returns:** `boolean` - True if the version supports multiple variables (> 1.114.22), false otherwise.

**Examples:**

```typescript
import { isMultiVariableSupport } from '@microsoft/logic-apps-shared';

isMultiVariableSupport('1.114.23'); // true
isMultiVariableSupport('1.114.22'); // false (requires version > 1.114.22)
isMultiVariableSupport(undefined); // false
isMultiVariableSupport('invalid'); // false (no error thrown, just returns false)
```

## Version Format

All version strings must follow the semantic versioning format: `major.minor.patch`

- All parts must be non-negative integers
- Example valid versions: `1.0.0`, `1.114.22`, `2.0.0`, `0.0.0`
- Example invalid versions: `1.0`, `1.x.0`, `invalid`, `-1.0.0`

## Use Cases

### Feature Flags Based on Version

```typescript
import { isVersionSupported } from '@microsoft/logic-apps-shared';

const hostVersion = '1.115.0';

// Enable feature if version >= 1.114.22
const enableMultiVariable = isVersionSupported(hostVersion, '1.114.22');

// Enable feature only for specific version
const enableBetaFeature = isVersionSupported(hostVersion, '1.115.0', true);
```

### Version Gating in Service Configuration

```typescript
import { isVersionSupported } from '@microsoft/logic-apps-shared';

function getServiceConfiguration(hostVersion: string) {
  const config = {
    baseFeatures: true,
  };

  try {
    if (isVersionSupported(hostVersion, '1.100.0')) {
      config.advancedFeatures = true;
    }

    if (isVersionSupported(hostVersion, '1.114.22')) {
      config.multiVariableSupport = true;
    }

    if (isVersionSupported(hostVersion, '2.0.0')) {
      config.nextGenFeatures = true;
    }
  } catch (error) {
    console.warn('Invalid version format:', error.message);
  }

  return config;
}
```

### Migration Path

If you're currently using `isMultiVariableSupport`, you can migrate to the new API:

```typescript
// Old (deprecated)
const supported = isMultiVariableSupport(version);

// New (recommended)
const supported = version && isVersionSupported(version, '1.114.22') &&
                  compareVersions(version, '1.114.22') > 0;

// Or for most use cases (>= instead of >)
const supported = version && isVersionSupported(version, '1.114.23');
```
