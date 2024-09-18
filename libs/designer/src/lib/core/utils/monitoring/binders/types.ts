import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

export type BindFunction<T> = (values: any, parameter: T) => BoundParameter<any> | undefined;

export interface BoundParameter<T> {
  displayName: string;
  dynamicValue?: T;
  format?: string;
  language?: string;
  trace?: LogicAppsV2.TraceSubexpression[];
  value: T;
  visibility?: string;
}

export type BoundParameters = Record<string, BoundParameter<any>>;

export type ReduceFunction<T, U> = (previous: T, current: U) => T;
