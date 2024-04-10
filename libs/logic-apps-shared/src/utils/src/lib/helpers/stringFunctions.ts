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

export const escapeString = (s: string): string => {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
};

export const isStringNumberOrBoolean = (s: string) => {
  if (typeof s !== 'string') {
    return false;
  }
  if (s.toLowerCase() === 'true' || s.toLowerCase() === 'false') {
    return 'boolean';
  }
  if (!isNaN(Number(s))) {
    return 'number';
  }
  return false;
};
