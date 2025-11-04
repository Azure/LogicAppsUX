import { ArgumentException } from '../exception';

/**
 * Parses a semantic version string into its components.
 * @arg {string} version - The version string to parse (e.g., "1.114.23").
 * @return {[number, number, number]} - A tuple of [major, minor, patch] version numbers.
 * @throws {ArgumentException} If the version string is invalid or contains non-numeric parts.
 */
const parseVersion = (version: string): [number, number, number] => {
  if (!version || typeof version !== 'string') {
    throw new ArgumentException('Version must be a non-empty string');
  }

  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new ArgumentException(`Invalid version format: "${version}". Expected format: "major.minor.patch"`);
  }

  const [major, minor, patch] = parts.map(Number);

  if ([major, minor, patch].some(Number.isNaN) || [major, minor, patch].some((v) => v < 0)) {
    throw new ArgumentException(`Invalid version format: "${version}". All parts must be non-negative numbers`);
  }

  return [major, minor, patch];
};

/**
 * Compares two semantic version strings.
 * @arg {string} currentVersion - The current version to check.
 * @arg {string} requiredVersion - The required version to compare against.
 * @return {number} - Returns -1 if currentVersion < requiredVersion, 0 if equal, 1 if currentVersion > requiredVersion.
 * @throws {ArgumentException} If either version string is invalid.
 */
const compareVersions = (currentVersion: string, requiredVersion: string): number => {
  const [currentMajor, currentMinor, currentPatch] = parseVersion(currentVersion);
  const [requiredMajor, requiredMinor, requiredPatch] = parseVersion(requiredVersion);

  if (currentMajor !== requiredMajor) {
    return currentMajor > requiredMajor ? 1 : -1;
  }
  if (currentMinor !== requiredMinor) {
    return currentMinor > requiredMinor ? 1 : -1;
  }
  if (currentPatch !== requiredPatch) {
    return currentPatch > requiredPatch ? 1 : -1;
  }

  return 0;
};

/**
 * Checks if a current version meets the required version criteria.
 * @arg {string} currentVersion - The current version to check (e.g., "1.115.0").
 * @arg {string} requiredVersion - The required version to compare against (e.g., "1.114.22").
 * @arg {boolean} [exactMatch=false] - If true, requires exact version match. If false, allows current version to be equal or greater.
 * @return {boolean} - True if the version criteria is met.
 * @throws {ArgumentException} If either version string is invalid.
 */
export const isVersionSupported = (currentVersion: string, requiredVersion: string, exactMatch = false): boolean => {
  if (!currentVersion || !requiredVersion) {
    return false;
  }
  const comparison = compareVersions(currentVersion, requiredVersion);

  if (exactMatch) {
    return comparison === 0;
  }

  return comparison >= 0;
};

/**
 * Checks if the host version supports multiple variable operations.
 * @arg {string | undefined} version - The host version string (e.g., "1.114.23").
 * @return {boolean} - True if the version supports multiple variables (> 1.114.22).
 * @deprecated Use isVersionSupported(version, "1.114.22") instead.
 */
export const isMultiVariableSupport = (version?: string): boolean => {
  if (!version) {
    return false;
  }

  try {
    return isVersionSupported(version, '1.114.22') && compareVersions(version, '1.114.22') > 0;
  } catch {
    return false;
  }
};
