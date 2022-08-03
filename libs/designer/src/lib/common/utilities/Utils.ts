import toTitleCase from 'to-title-case';

export const convertActionIDToTitleCase = (s: string) => {
  return toTitleCase(s.replace(/_/g, ' '));
};

export const getIdLeaf = (id?: string) => id?.split('/').at(-1) ?? '';
