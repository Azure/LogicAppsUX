// This type takes another type, and and ensures that the properties are indexed by strings
export type StringIndexed<T> = {
  [index: string]: unknown;
} & T;
