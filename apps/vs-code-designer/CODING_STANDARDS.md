# VS Code Extension Coding Standards

This document outlines the coding standards and best practices for the Azure Logic Apps VS Code extension development. These standards ensure consistency, maintainability, and high code quality across the extension.

## Table of Contents

- [General Principles](#general-principles)
- [TypeScript Standards](#typescript-standards)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Code Structure](#code-structure)
- [Error Handling](#error-handling)
- [Documentation](#documentation)
- [Testing](#testing)
- [VS Code Extension Specific Guidelines](#vs-code-extension-specific-guidelines)
- [Performance Guidelines](#performance-guidelines)
- [Security Guidelines](#security-guidelines)
- [Linting and Type Checking](#linting-and-type-checking)

## General Principles

### Code Quality
- Write self-documenting code with clear, descriptive variable and function names
- Prefer composition over inheritance
- Follow the Single Responsibility Principle (SRP)
- Keep functions small and focused (ideally under 50 lines)
- Use meaningful abstractions and avoid premature optimization

### Consistency
- Follow existing code patterns and conventions in the codebase
- Use the established project structure and organization
- Maintain consistent formatting across all files
- Apply the same coding patterns throughout the extension

## TypeScript Standards

### Type Safety
- **Always use TypeScript**: All new code must be written in TypeScript
- **Strict Mode**: Use strict TypeScript compiler options
- **Explicit Types**: Prefer explicit type annotations for function parameters and return types
- **Avoid `any`**: Use specific types instead of `any`. When necessary, use `unknown` or create proper type definitions
- **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`) operators

```typescript
// ✅ Good
interface UserOptions {
  readonly name: string;
  readonly age?: number;
  readonly preferences: ReadonlyArray<string>;
}

function processUser(options: UserOptions): Promise<ProcessResult> {
  // Implementation
}

// ❌ Bad
function processUser(options: any): any {
  // Implementation
}
```

### Interface and Type Definitions
- **Prefer Interfaces**: Use `interface` over `type` for object shapes
- **Consistent Type Imports**: Use `import type` for type-only imports
- **Generic Constraints**: Use generic constraints appropriately
- **Readonly Properties**: Make properties readonly when they shouldn't be mutated

```typescript
// ✅ Good
import type { ExtensionContext } from 'vscode';

interface CommandContext {
  readonly extensionContext: ExtensionContext;
  readonly telemetry: TelemetryProperties;
}

// ❌ Bad
import { ExtensionContext } from 'vscode'; // Importing type as value

interface CommandContext {
  extensionContext: ExtensionContext; // Not readonly
  telemetry: any; // Using any
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
// ✅ Good
async function createLogicApp(): Promise<LogicApp> { }
function isValidWorkspace(): boolean { }
function hasRequiredPermissions(): boolean { }
async function downloadAppSettings(): Promise<AppSettings> { }

// ❌ Bad
async function create(): Promise<any> { }
function valid(): boolean { }
function check(): boolean { }
```

### Variables and Constants
- Use descriptive names that explain the purpose
- Avoid abbreviations unless they're widely understood
- Use positive naming for booleans

```typescript
// ✅ Good
const extensionVersion = '1.0.0';
const isUserAuthenticated = true;
const workspaceConfiguration = getConfiguration();

// ❌ Bad
const ver = '1.0.0';
const isNotLoggedOut = true;
const cfg = getConfiguration();
```

### Classes and Interfaces
- Classes should be nouns representing entities
- Interfaces should describe capabilities or data structures
- Use descriptive suffixes like `Provider`, `Manager`, `Service`, `Step`

```typescript
// ✅ Good
class LogicAppTreeProvider { }
interface DeploymentConfiguration { }
class AzureStorageManager { }
interface CommandExecutionContext { }

// ❌ Bad
class Helper { }
interface Data { }
class Util { }
```

## Code Structure

### Function Organization
```typescript
// ✅ Good structure
export class WorkflowCreateStep extends AzureWizardPromptStep<IProjectWizardContext> {
  // Public properties first
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

### Import Organization
```typescript
// 1. Node.js built-in modules
import * as path from 'path';
import * as fs from 'fs-extra';

// 2. Third-party libraries
import * as vscode from 'vscode';

// 3. Microsoft/Azure libraries
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';

// 4. Internal imports (relative paths last)
import { localize } from '../../localize';
import type { IProjectContext } from './types';
```

## Error Handling

### Exception Handling
- Always handle exceptions appropriately
- Use specific error types when possible
- Provide meaningful error messages
- Log errors with appropriate context

```typescript
// ✅ Good
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

// ❌ Bad
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
// ✅ Good
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
- Add TODO comments with context

```typescript
// ✅ Good
// Using a retry mechanism because Azure Resource Manager APIs can be temporarily unavailable
const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  // Implementation
}

// TODO(username): Refactor this to use the new Azure SDK v12 when it supports Logic Apps
// See GitHub issue: #1234

// ❌ Bad
// Increment i by 1
i++;

// Set the name variable
const name = user.name;
```

## Testing

### Unit Tests
- Write tests for all public methods
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

```typescript
// ✅ Good
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

## VS Code Extension Specific Guidelines

### Extension Activation
- Keep activation lightweight and fast
- Register commands and providers during activation
- Use lazy loading for heavy operations
- Handle activation failures gracefully

```typescript
// ✅ Good
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Quick setup
    registerBasicCommands(context);
    
    // Lazy initialization
    void initializeHeavyServices(); // Don't await
    
    // Register for cleanup
    context.subscriptions.push(/* disposables */);
  } catch (error) {
    // Handle gracefully
    vscode.window.showErrorMessage('Extension activation failed');
    throw error;
  }
}
```

### Command Implementation
- Follow VS Code command naming conventions
- Implement proper error handling and user feedback
- Use telemetry for command usage tracking

```typescript
// ✅ Good
export async function createLogicAppCommand(): Promise<void> {
  await callWithTelemetryAndErrorHandling('logicApps.createLogicApp', async (context: IActionContext) => {
    context.telemetry.properties.isActivationEvent = 'false';
    
    try {
      const result = await showCreateLogicAppWizard(context);
      context.telemetry.properties.result = 'success';
      
      await vscode.window.showInformationMessage(
        localize('createSuccess', 'Logic App "{0}" created successfully', result.name)
      );
    } catch (error) {
      context.telemetry.properties.result = 'failure';
      throw error;
    }
  });
}
```

### Tree Data Provider
- Implement efficient tree refresh mechanisms
- Use proper icons and context values
- Handle tree item state consistently

```typescript
// ✅ Good
export class LogicAppTreeProvider implements vscode.TreeDataProvider<LogicAppTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<LogicAppTreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  public refresh(element?: LogicAppTreeItem): void {
    this._onDidChangeTreeData.fire(element);
  }

  public getTreeItem(element: LogicAppTreeItem): vscode.TreeItem {
    return {
      label: element.label,
      contextValue: element.contextValue,
      iconPath: element.iconPath,
      collapsibleState: element.collapsibleState,
      command: element.command
    };
  }
}
```

## Performance Guidelines

### Async/Await Usage
- Use `Promise.all()` for parallel operations
- Avoid blocking the main thread
- Implement proper cancellation support

```typescript
// ✅ Good - Parallel execution
const [settings, connections, workflows] = await Promise.all([
  loadAppSettings(context),
  loadConnections(context),
  loadWorkflows(context)
]);

// ✅ Good - Cancellation support
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
// ✅ Good
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
- Validate all user inputs
- Sanitize file paths and URLs
- Use parameterized queries for database operations

```typescript
// ✅ Good
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
// ✅ Good
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

## Linting and Type Checking

### Configuration
The project uses both Biome and ESLint for code quality:

- **Biome**: Primary linter for formatting and basic rules
- **ESLint**: Additional TypeScript-specific rules
- **TypeScript**: Strict type checking enabled

### Key Rules Enabled
- Strict null checks
- No implicit any
- Explicit function return types (warning)
- Consistent type imports
- No floating promises
- Prefer readonly parameters where possible

### Available Linting Scripts

The VS Code extension project provides several scripts for code quality checking:

```bash
# Type checking only
pnpm run type:check

# ESLint checking (reports issues without fixing)
pnpm run lint:check

# ESLint with auto-fix
pnpm run lint:fix

# Combined type checking and linting
pnpm run code:check

# Combined auto-fix and type checking
pnpm run code:fix

# Original lint with zero warnings policy
pnpm run lint

# Run all linting and formatting (root level)
pnpm run check
```

### ESLint Naming Convention Rules

The project enforces strict naming conventions through ESLint:

#### Enforced Naming Patterns

| Element Type | Convention | Example | ESLint Rule |
|-------------|------------|---------|-------------|
| **Variables** | `camelCase` or `UPPER_CASE` | `userName`, `MAX_RETRY_COUNT` | ✅ Enforced |
| **Functions** | `camelCase` | `createLogicApp()` | ✅ Enforced |
| **Methods** | `camelCase` | `getUserData()` | ✅ Enforced |
| **Parameters** | `camelCase` | `function handle(requestData)` | ✅ Enforced |
| **Classes** | `PascalCase` | `LogicAppManager` | ✅ Enforced |
| **Interfaces** | `PascalCase` with `I` prefix | `IUserContext` | ✅ Enforced |
| **Types** | `PascalCase` | `UserRole` | ✅ Enforced |
| **Enums** | `PascalCase` | `ConnectionState` | ✅ Enforced |
| **Enum Members** | `PascalCase` | `ConnectionState.Connected` | ✅ Enforced |
| **Properties** | `camelCase` or `UPPER_CASE` | `user.firstName`, `CONFIG.MAX_SIZE` | ✅ Enforced |
| **Private Members** | `camelCase` (leading underscore allowed) | `private _internalState` | ✅ Enforced |

#### Examples of Enforced Conventions

```typescript
// ✅ Correct naming conventions
interface IUserConfiguration {
  readonly userName: string;
  readonly maxRetries: number;
}

class LogicAppManager {
  private readonly _connectionCache: Map<string, Connection>;
  public readonly MAX_CONNECTIONS = 10;

  public async createLogicApp(appConfiguration: IUserConfiguration): Promise<LogicApp> {
    // Implementation
  }

  private validateUserInput(inputData: unknown): boolean {
    // Implementation
  }
}

enum DeploymentState {
  Pending,
  InProgress,
  Completed,
  Failed
}

// ❌ Incorrect naming (will trigger ESLint errors)
interface userConfiguration { } // Should be IUserConfiguration
class logicAppManager { } // Should be LogicAppManager  
function CreateLogicApp() { } // Should be createLogicApp
const user_name = 'test'; // Should be userName
enum deployment_state { } // Should be DeploymentState
```

#### Underscore Rules

- **Leading underscores**: Forbidden for most elements, allowed only for private class members
- **Trailing underscores**: Forbidden for all elements
- **Parameter underscores**: Leading underscores allowed (useful for unused parameters)

```typescript
// ✅ Acceptable underscore usage
class ServiceManager {
  private _internalCache: Map<string, any>; // OK: private member
  
  public processData(_unusedParam: string, actualData: string): void {
    // OK: unused parameter marked with underscore
  }
}

// ❌ Invalid underscore usage  
const _publicVariable = 'test'; // Error: leading underscore on non-private
const dataValue_ = 'test'; // Error: trailing underscore
```

### Pre-commit Hooks
- Format code with Biome
- Run ESLint with auto-fix
- Type check with TypeScript compiler
- Run unit tests

## Development Workflow

### Before Committing
1. Run `pnpm run check` to format and lint code
2. Run `pnpm run test:extension-unit` to execute unit tests
3. Build the extension with `pnpm run build:extension`
4. Test the extension manually in VS Code

### Code Review Checklist
- [ ] Code follows naming conventions
- [ ] Functions have explicit return types
- [ ] Error handling is comprehensive
- [ ] JSDoc comments for public APIs
- [ ] Unit tests cover new functionality
- [ ] No console.log statements in production code
- [ ] Proper disposal of resources
- [ ] Telemetry added for user actions

## Conclusion

These coding standards ensure that the Azure Logic Apps VS Code extension maintains high quality, consistency, and reliability. All contributors should familiarize themselves with these guidelines and apply them consistently in their development work.

For questions or suggestions regarding these standards, please create an issue in the repository or reach out to the development team.

---

**Last Updated**: 2024
**Version**: 1.0