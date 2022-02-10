export type BoundParameters = Record<string, BoundParameter<any>>;

interface BoundParameter<T> {
  displayName: string;
  dynamicValue?: T;
  format?: string;
  language?: string;
  value: T;
  visibility?: string;
}
