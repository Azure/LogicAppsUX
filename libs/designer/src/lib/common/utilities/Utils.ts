export const getIdLeaf = (id?: string) => id?.split('/').at(-1) ?? '';
