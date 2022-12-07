export enum ProjectLanguage {
  CSharp = 'C#',
  CSharpScript = 'C#Script',
  FSharp = 'F#',
  FSharpScript = 'F#Script',
  Java = 'Java',
  JavaScript = 'JavaScript',
  PowerShell = 'PowerShell',
  TypeScript = 'TypeScript',
  Python = 'Python',
  Custom = 'Custom',
}

export enum LanguageScript {
  CSharpScript = 'run.csx',
  FSharpScript = 'run.fsx',
  JavaScript = 'index.js',
  PowerShell = 'run.ps1',
  TypeScript = 'index.ts',
}

export enum WorkerRuntime {
  Node = 'node',
  Dotnet = 'dotnet',
  Java = 'java',
  PowerShell = 'powershell',
}
