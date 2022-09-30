export const idDisplayCase = (s: string) => removeIdTag(labelCase(s));
export const labelCase = (label: string) => label?.replace(/_/g, ' ');
export const removeIdTag = (id: string) => id?.split('-#')[0];

export const getIdLeaf = (id?: string) => id?.split('/').at(-1) ?? '';

const normalizeApiId = (id?: string) => id?.replace(/\s+/, '').toLowerCase();
export const areApiIdsEqual = (id1?: string, id2?: string) => normalizeApiId(id1) === normalizeApiId(id2);
