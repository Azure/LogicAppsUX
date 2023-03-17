// This file can be replaced during build by using the `fileReplacements` array.
// When building for production, this file is replaced with `environment.prod.ts`.

export interface EnvironmentVars {
  production: boolean;
  armToken?: string;
}
export const environment: EnvironmentVars = {
  production: false,
};

const replaceArmToken = async () => {
  try {
    const armTokenData = await import('./.armToken.json');
    environment.armToken = `${armTokenData.accessToken}`;
  } catch {
    console.log('ARM Token not accessable');
  }
};

replaceArmToken();
