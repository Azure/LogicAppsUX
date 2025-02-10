export const idDisplayCase = (s: string) => removeIdTag(labelCase(s));
export const labelCase = (label: string) => label?.replace(/_/g, ' ');

export const replaceWhiteSpaceWithUnderscore = (uiElementName: string): string => {
  return uiElementName?.replace(/\W/g, '_')?.toLowerCase();
};

export const containsIdTag = (id: string) => id?.includes('-#');
export const removeIdTag = (id: string) => id?.split('-#')[0];

export const getIdLeaf = (id?: string) => id?.split('/').at(-1) ?? '';

const normalizeApiId = (id?: string) => id?.replace(/\s+/, '').toLowerCase();
export const areApiIdsEqual = (id1?: string, id2?: string) => normalizeApiId(id1) === normalizeApiId(id2);

export const capitalizeFirstLetter = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const normalizeAutomationId = (s: string) => s.replace(/\W/g, '-');

export const wrapTokenValue = (s: string) => `@{${s}}`;

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false;
  }
};

export const createIdCopy = (id: string) => `${id}-copy`;

export const cleanResourceId = (resourceId?: string): string => {
  return resourceId?.startsWith('/') ? resourceId : `/${resourceId}`;
};

export const unescapeString = (input: string): string => {
  return input.replace(/\\([nrtv])/g, (_match, char) => {
    switch (char) {
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'v':
        return '\v';
      default:
        return char;
    }
  });
};

export const escapeString = (input: string): string => {
  return input.replace(/[\n\r\t\v]/g, (char) => {
    switch (char) {
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      case '\v':
        return '\\v';
      default:
        return char;
    }
  });
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
