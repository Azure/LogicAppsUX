# VS Code Extension Coding Standards

This document outlines the coding standards and best practices for the Azure Logic Apps VS Code extension development. These standards ensure consistency, maintainability, and high code quality across the extension. Contributors are encouraged to review these coding standards in their entirety before making contributions.

## Table of Contents

- [General Principles](#general-principles)
- [TypeScript Standards](#typescript-standards)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Class Structure](#class-structure)
- [Error Handling](#error-handling)
- [Documentation](#documentation)
- [Testing](#testing)
- [Performance Guidelines](#performance-guidelines)
- [Security Guidelines](#security-guidelines)

## General Principles
- Write self-documenting code with clear, descriptive variable and function names
- Prefer composition over inheritance
- Follow the Single Responsibility Principle (SRP)
- Keep functions small and focused (ideally under 50 lines)
- Follow existing code patterns, conventions, and file structure in the codebase
- Maintain consistent formatting across all files
- Avoid multiple levels of nesting (prefer early returns or extract to function if needed)

## TypeScript Standards

### Type Safety
- **Always use TypeScript**: All new code must be written in TypeScript
- **Strict Mode**: Use strict TypeScript compiler options
- **Explicit Types**: Prefer explicit type annotations for function parameters and return types
- **Avoid `any`**: Use specific types instead of `any`. When necessary, use `unknown` or create proper type definitions
- **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`) operators

```typescript
// Good
interface UserOptions {
  readonly name: string;
  readonly age?: number;
  readonly preferences: ReadonlyArray<string>;
}

function processUser(options: UserOptions): Promise<ProcessResult> {
  // Implementation
}

// Bad
function processUser(options: any): any {
  // Implementation
}
```

## File Organization

### Directory Structure
```
src/
├── app/                           # Main application logic
│   ├── commands/                  # Command implementations
│   │   ├── [commandGroup]/        # Group related commands
│   │   │   ├── index.ts          # Export barrel
│   │   │   └── [command].ts      # Individual command files
│   ├── tree/                     # Tree view providers
│   ├── utils/                    # Utility functions
│   │   ├── [category]/           # Categorized utilities
│   │   └── index.ts              # Export barrel
│   └── templates/                # Template providers
├── assets/                       # Static assets
├── constants.ts                  # Application constants
├── extensionVariables.ts         # Extension global variables
├── main.ts                       # Extension entry point
└── localize.ts                   # Localization utilities
```

### File Naming
- **PascalCase**: For classes, interfaces, and React components
- **camelCase**: For functions, variables, and file names
- **kebab-case**: For directories when they contain multiple words
- **UPPER_SNAKE_CASE**: For constants

```typescript
// File: userManagement.ts
export class UserManager { }
export interface UserOptions { }
export const DEFAULT_USER_SETTINGS = { };
export function createUser() { }
```

## Naming Conventions

### Functions and Methods
- Use descriptive verb-noun combinations
- Prefix boolean functions with `is`, `has`, `can`, `should`
- Use async function names that indicate asynchronous behavior

```typescript
// Good
async function createLogicApp(): Promise<LogicApp> { }
function isValidWorkspace(): boolean { }
function hasRequiredPermissions(): boolean { }
async function downloadAppSettings(): Promise<AppSettings> { }

// Bad
async function create(): Promise<any> { }
function valid(): boolean { }
function check(): boolean { }
```

### Variables and Constants
- Use descriptive names that explain the purpose
- Avoid abbreviations unless they're widely understood
- Use positive naming for booleans

```typescript
// Good
const extensionVersion = '1.0.0';
const isUserAuthenticated = true;
const workspaceConfiguration = getConfiguration();

// Bad
const ver = '1.0.0';
const isNotLoggedOut = true;
const cfg = getConfiguration();
```

### Classes and Interfaces
- Classes should be nouns representing entities
- Interfaces should describe capabilities or data structures
- Use descriptive suffixes like `Provider`, `Manager`, `Service`, `Step`

```typescript
// Good
class LogicAppTreeProvider { }
interface DeploymentConfiguration { }
class AzureStorageManager { }
interface CommandExecutionContext { }

// Bad
class Helper { }
interface Data { }
class Util { }
```

## Class structure

```typescript
// Good structure
export class WorkflowCreateStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Static members first
  public static GetStepName(): string {
    // ...
  }

  // Public properties
  public readonly hideStepCount = true;
  
  // Private properties
  private readonly templatePaths = {
    // ...
  };

  // Constructor
  constructor() {
    super();
  }

  // Public methods
  public async prompt(context: IProjectWizardContext): Promise<void> {
    // Implementation
  }

  public shouldPrompt(): boolean {
    // Implementation
  }

  // Private methods (ordered by usage)
  private async createProjectFiles(): Promise<void> {
    // Implementation
  }

  private validateConfiguration(): boolean {
    // Implementation
  }
}
```

## Error Handling

### Exception Handling
- Always handle exceptions appropriately
- Use specific error types when possible
- Provide meaningful error messages
- Log errors with appropriate context

```typescript
// Good
export async function deployLogicApp(context: IDeployContext): Promise<void> {
  try {
    await validateDeploymentConfiguration(context);
    await performDeployment(context);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.telemetry.properties.error = errorMessage;
    throw new Error(localize('deploymentFailed', 'Failed to deploy Logic App: {0}', errorMessage));
  }
}

// Bad
export async function deployLogicApp(context: any): Promise<void> {
  try {
    // deployment logic
  } catch (e) {
    throw e; // Re-throwing without context
  }
}
```

### Validation
- Validate inputs early and explicitly
- Use type guards for runtime type checking
- Provide clear validation error messages

```typescript
// Good
function validateWorkspaceFolder(folder: vscode.WorkspaceFolder | undefined): vscode.WorkspaceFolder {
  if (!folder) {
    throw new Error(localize('noWorkspaceFolder', 'No workspace folder is currently open'));
  }
  return folder;
}

// Type guard
function isLogicAppProject(project: unknown): project is LogicAppProject {
  return typeof project === 'object' && 
         project !== null && 
         'type' in project && 
         project.type === 'logicApp';
}
```

## Documentation

### JSDoc Comments
- Document all public APIs
- Use consistent JSDoc format
- Include parameter and return type information
- Add examples for complex functions

```typescript
/**
 * Creates a new Logic App workflow in the specified workspace.
 * 
 * @param context - The wizard context containing user selections
 * @param workspacePath - The path to the target workspace folder
 * @returns A promise that resolves to the created workflow configuration
 * 
 * @example
 * ```typescript
 * const workflow = await createWorkflow(context, '/path/to/workspace');
 * console.log(`Created workflow: ${workflow.name}`);
 * ```
 * 
 * @throws {Error} When the workspace path is invalid or inaccessible
 */
export async function createWorkflow(
  context: IWorkflowContext,
  workspacePath: string
): Promise<WorkflowConfiguration> {
  // Implementation
}
```

### Code Comments
- Explain **why**, not **what**
- Use comments sparingly for self-documenting code
- Document complex business logic
- Add TODO comments with context and the contributor's username

```typescript
// Good
// Using a retry mechanism because Azure Resource Manager APIs can be temporarily unavailable
const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  // Implementation
}

// TODO(username): Refactor this to use the new Azure SDK v12 when it supports Logic Apps
// See GitHub issue: #1234

// Bad
// Increment i by 1
i++;

// Set the name variable
const name = user.name;
```

## Testing

### Unit Tests
- **All new features and updates to existing features must include corresponding tests**
- Write tests for all public methods
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

```typescript
// Good
describe('UserManager', () => {
  describe('createUser', () => {
    it('should create user with valid configuration and return user ID', async () => {
      // Arrange
      const mockContext = createMockContext();
      const userConfig = { name: 'Test User', email: 'test@example.com' };
      
      // Act
      const result = await userManager.createUser(mockContext, userConfig);
      
      // Assert
      expect(result.userId).toBeDefined();
      expect(result.name).toBe(userConfig.name);
    });

    it('should throw error when configuration is invalid', async () => {
      // Arrange
      const mockContext = createMockContext();
      const invalidConfig = { name: '' }; // Missing email
      
      // Act & Assert
      await expect(userManager.createUser(mockContext, invalidConfig))
        .rejects.toThrow('Invalid user configuration');
    });
  });
});
```

## Performance Guidelines

### Async/Await Usage
- Use `Promise.all()` for parallel operations
- Avoid blocking the main thread
- Implement proper cancellation support

```typescript
// Good - Parallel execution
const [settings, connections, workflows] = await Promise.all([
  loadAppSettings(context),
  loadConnections(context),
  loadWorkflows(context)
]);

// Good - Cancellation support
export async function downloadLargeFile(
  url: string,
  token: vscode.CancellationToken
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      // Handle response
    });
    
    token.onCancellationRequested(() => {
      request.destroy();
      reject(new Error('Operation cancelled'));
    });
  });
}
```

### Memory Management
- Dispose of resources properly
- Use weak references where appropriate
- Avoid memory leaks in event listeners

```typescript
// Good
export class ResourceManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.json');
    this.disposables.push(watcher);
    
    watcher.onDidChange(this.handleFileChange, this);
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
```

## Security Guidelines

### Input Validation
- Validate/escape all user inputs
- Sanitize file paths and URLs

```typescript
// Good
function validateFilePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }
  
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  
  return normalizedPath;
}
```

### Secrets Management
- Never log secrets or sensitive information
- Use VS Code's secret storage for credentials
- Mask sensitive data in error messages

```typescript
// Good
export class CredentialManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async storeCredential(key: string, value: string): Promise<void> {
    await this.context.secrets.store(key, value);
  }

  public async getCredential(key: string): Promise<string | undefined> {
    return await this.context.secrets.get(key);
  }
}
```