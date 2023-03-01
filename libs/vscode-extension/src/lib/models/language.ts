export enum ProjectLanguage {
  CSharp = 'C#',
  CSharpScript = 'C#Script',
  FSharp = 'F#',
  FSharpScript = 'F#Script',
  JavaScript = 'JavaScript',
  TypeScript = 'TypeScript',
  Java = 'Java',
  Custom = 'Custom',
  PowerShell = 'PowerShell',
}

export enum LanguageScript {
  CSharpScript = 'run.csx',
  FSharpScript = 'run.fsx',
  JavaScript = 'index.js',
  TypeScript = 'index.ts',
}

export enum WorkerRuntime {
  Node = 'node',
  Dotnet = 'dotnet',
}
