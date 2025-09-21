// This type takes another type, and and ensures that the properties are indexed by strings
export type StringIndexed<T> = {
  [index: string]: unknown;
} & T;

// This type makes all properties in a type recursively optional
export type DeepPartial<T> = T extends object ? {
	[P in keyof T]?: DeepPartial<T[P]>;
} : T;