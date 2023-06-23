import toTitleCase from 'to-title-case';

export const titleCase = (s: string) => toTitleCase(s);

export const isOpenApiSchemaVersion = (definition: any) => definition?.$schema?.includes('2023-01-31-preview');
