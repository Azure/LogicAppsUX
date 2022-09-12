import toTitleCase from 'to-title-case';

export const idDisplayCase = (s: string) => removeIdTag(titleCase(s));
export const titleCase = (s: string) => toTitleCase(labelCase(s));
export const labelCase = (label: string) => label?.replace(/_/g, ' ');
export const removeIdTag = (id: string) => id?.split('-#')[0];

export const getIdLeaf = (id?: string) => id?.split('/').at(-1) ?? '';
