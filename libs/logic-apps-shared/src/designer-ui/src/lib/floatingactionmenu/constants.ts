// Used in operation manifest ['x-ms-editor-options'].menuKind
export const FloatingActionMenuKind = {
  inputs: 'inputs',
  outputs: 'outputs',
} as const;
export type FloatingActionMenuKind = (typeof FloatingActionMenuKind)[keyof typeof FloatingActionMenuKind];
