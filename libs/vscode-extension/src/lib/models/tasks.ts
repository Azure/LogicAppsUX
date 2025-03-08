import type { TaskDefinition } from 'vscode';

export interface ITasksJson {
  version: string;
  tasks?: ITask[];
  inputs?: ITaskInputs[];
}

export interface ITask extends TaskDefinition {
  label?: string;
  command?: string;
  options?: ITaskOptions;
}

export interface ITaskInputs extends TaskDefinition {
  id: string;
  type: string;
  command?: string;
  args?: string;
}

export interface ITaskOptions {
  cwd?: string;
  env?: {
    [key: string]: string;
  };
}
