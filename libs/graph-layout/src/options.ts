import type { LayoutOptions } from './types';

export class GraphLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphLayoutError';
  }
}

export const getOption = (options: LayoutOptions | undefined, keys: readonly string[]): string | undefined =>
  keys.map((key) => options?.[key]).find((value) => value !== undefined);
