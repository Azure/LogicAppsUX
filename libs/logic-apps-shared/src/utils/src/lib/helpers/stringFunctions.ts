export const idDisplayCase = (s: string) => removeIdTag(labelCase(s));
export const labelCase = (label: string) => label?.replace(/_/g, ' ');

export const replaceWhiteSpaceWithUnderscore = (uiElementName: string): string => {
  return uiElementName?.replace(/[^a-zA-Z0-9_#]/g, '_')?.toLowerCase();
};

export const containsIdTag = (id: string) => id?.includes('-#');
export const removeIdTag = (id: string) => id?.split('-#')[0];
export const containsCaseTag = (id: string) => id?.includes('-addCase');

export const getIdLeaf = (id?: string) => id?.split('/').at(-1) ?? '';

const normalizeApiId = (id?: string) => id?.replace(/\s+/, '').toLowerCase();
export const areApiIdsEqual = (id1?: string, id2?: string) => normalizeApiId(id1) === normalizeApiId(id2);

export const capitalizeFirstLetter = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const normalizeAutomationId = (s: string) => s.replace(/\W/g, '-');

export const wrapTokenValue = (s: string) => `@{${s}}`;

export const wrapStringInQuotes = (s: string) => `"${s}"`;

export const unwrapQuotesFromString = (s: string) => {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
};

export const normalizeEscapes = (key: string): string => key.replace(/\n/g, '\\n').replace(/\r/g, '\\r');

export const wrapStringifiedTokenSegments = (jsonString: string): string => {
  const tokenRegex = /:\s?("@\{.*?\}")|:\s?(@\{.*?\})/gs;

  // First, normalize newlines and carriage returns inside @{...} expressions
  const normalized = jsonString.replace(/@{[^}]*}/gs, (match) => match.replace(/\n/g, '\\n').replace(/\r/g, '\\r'));

  // Escape backslashes, quotes, and other special characters within the token string
  return normalized.replace(tokenRegex, (match, quotedToken, unquotedToken) => {
    const token = quotedToken ?? unquotedToken;
    if (!token) {
      return match;
    }

    const isQuoted = quotedToken !== undefined;
    const innerToken = isQuoted ? token.slice(1, -1) : token;

    const escaped = innerToken
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\n/g, '\\n') // Escape newline
      .replace(/\r/g, '\\r') // Escape carriage return
      .replace(/\t/g, '\\t') // Escape tab
      .replace(/\v/g, '\\v'); // Escape vertical tab

    return `: "${escaped}"`;
  });
};

// Some staging locations like `East US (stage)` show sometimes as `eastus(stage)` and sometimes as `eastusstage`
// This function just removes the parentheses so they can be compared as equal
export const cleanConnectorId = (id: string) => id.replace(/[()]/g, '');

export const prettifyJsonString = (json: string) => JSON.stringify(JSON.parse(json), null, 4);

export const splitFileName = (fileName: string) => {
  const splitFileName = fileName.lastIndexOf('.');
  return [fileName.slice(0, splitFileName), fileName.slice(splitFileName)];
};

export const canStringBeConverted = (s: string): boolean => {
  if (typeof s !== 'string' || s.trim() === '') {
    return false;
  }
  if (s === 'true' || s === 'false' || s === 'null') {
    return true;
  }
  if (!Number.isNaN(Number(s))) {
    return true;
  }
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed);
  } catch (_e) {
    return false;
  }
};

export const createIdCopy = (id: string) => `${id}-copy`;

export const cleanResourceId = (resourceId?: string): string => {
  return resourceId?.startsWith('/') ? resourceId : `/${resourceId}`;
};

export const unescapeString = (input: string): string => {
  return input.replace(/\\([nrtv"\\])/g, (_match, char) => {
    switch (char) {
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'v':
        return '\v';
      case '"':
        return '"';
      case '\\':
        return '\\';
      default:
        return char;
    }
  });
};

export const escapeString = (input: string, requireSingleQuotesWrap?: boolean): string => {
  // Only apply escaping if requireSingleQuotesWrap is true and the input is wrapped in single quotes
  if (requireSingleQuotesWrap && !/'.*[\n\r\t\v"].*'/.test(input)) {
    return input;
  }

  return input?.replace(/[\n\r\t\v"]/g, (char) => {
    switch (char) {
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      case '\v':
        return '\\v';
      case '"':
        return requireSingleQuotesWrap ? '\\"' : '"'; // Escape only if requireSingleQuotesWrap is true
      default:
        return char;
    }
  });
};

export const escapeBackslash = (s: string): string => {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
};

/**
 * Converts a string to PascalCase.
 * Assumes the input string has been cleaned of invalid characters.
 * @param {string} str - The input string.
 * @returns {string} - The PascalCase version of the string.
 */
export function toPascalCase(str: string): string {
  return str.replace(/(?:_+|^)(\w)/g, (match, p1) => p1.toUpperCase());
}
