import type { DebugConfiguration } from 'vscode';

export interface ILaunchJson {
  version: string;
  configurations?: DebugConfiguration[];
}
