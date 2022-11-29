export enum FuncVersion {
  v1 = '~1',
  v2 = '~2',
  v3 = '~3',
  v4 = '~4',
}

export const latestGAVersion: FuncVersion = FuncVersion.v4;

export enum azureFunctionsVersion {
  v1 = 'Azure Functions v1',
  v2 = 'Azure Functions v2',
  v3 = 'Azure Functions v3',
  v4 = 'Azure Functions v4',
}

export interface ICommandResult {
  code: number;
  cmdOutput: string;
  cmdOutputIncludingStderr: string;
  formattedArgs: string;
}

export type pathRelativeFunc = (fsPath1: string, fsPath2: string) => string;
