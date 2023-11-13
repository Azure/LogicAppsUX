export const ProjectLanguage = {
  CSharp: 'C#',
  CSharpScript: 'C#Script',
  FSharp: 'F#',
  FSharpScript: 'F#Script',
  JavaScript: 'JavaScript',
  TypeScript: 'TypeScript',
  Java: 'Java',
  Custom: 'Custom',
  PowerShell: 'PowerShell',
} as const;
export type ProjectLanguage = (typeof ProjectLanguage)[keyof typeof ProjectLanguage];

export const LanguageScript = {
  CSharpScript: 'run.csx',
  FSharpScript: 'run.fsx',
  JavaScript: 'index.js',
  TypeScript: 'index.ts',
} as const;
export type LanguageScript = (typeof LanguageScript)[keyof typeof LanguageScript];

export const WorkerRuntime = {
  Node: 'node',
  Dotnet: 'dotnet',
  DotnetIsolated: 'dotnet-isolated',
} as const;
export type WorkerRuntime = (typeof WorkerRuntime)[keyof typeof WorkerRuntime];
