import type { EnvironmentVars } from './environment';

export type { EnvironmentVars } from './environment';

export const environment: EnvironmentVars = Object.freeze({
  production: true,
});

export const loadToken = async (): Promise<null> => null;

export const loadSubscriptionIds = async (): Promise<string[]> => [];
