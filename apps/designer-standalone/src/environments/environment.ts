// This file can be replaced during build by using the `fileReplacements` array.
// When building for production, this file is replaced with `environment.prod.ts`.
import armTokenData from './armToken.json';

export interface EnvironmentVars {
  production: boolean;
  armToken?: string;
}
export const environment: EnvironmentVars = {
  production: false,
  armToken: armTokenData.accessToken,
};
