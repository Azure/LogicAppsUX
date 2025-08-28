# VS Code Extension Coding Standards

This document outlines the coding standards, best practices, and guidelines for the Azure Logic Apps VS Code Extension development.

## Table of Contents

1. [Project Overview](#project-overview)
2. [File and Directory Naming Conventions](#file-and-directory-naming-conventions)
3. [TypeScript Coding Standards](#typescript-coding-standards)
4. [VS Code Extension Best Practices](#vs-code-extension-best-practices)
5. [Architecture Patterns](#architecture-patterns)
6. [Linting and Type Checking](#linting-and-type-checking)
7. [Testing Standards](#testing-standards)
8. [Error Handling](#error-handling)
9. [Performance Guidelines](#performance-guidelines)
10. [Documentation Standards](#documentation-standards)
11. [Security Best Practices](#security-best-practices)
12. [Development Workflow](#development-workflow)

## Project Overview

This VS Code extension provides Azure Logic Apps authoring, management, and deployment capabilities. The extension follows Microsoft's VS Code extension development best practices and integrates with Azure services.

### Key Technologies
- **TypeScript**: Primary language
- **VS Code Extension API**: Core framework
- **Azure SDK**: Cloud service integration
- **Azure Extension Utilities**: Shared Microsoft libraries
- **ESLint**: Code linting
- **Vitest**: Unit testing
- **Mocha**: E2E testing

## File and Directory Naming Conventions

### Files
- Use **PascalCase** for class files: `LogicAppResolver.ts`
- Use **camelCase** for utility/function files: `extensionVariables.ts`, `localize.ts`
- Use **kebab-case** for component files: `data-mapper-panel.ts`
- Use **UPPER_CASE** for constants files: `CONSTANTS.ts` (currently using `constants.ts` - consider renaming)
- Test files should end with `.test.ts` or `.spec.ts`
- Type definition files should end with `.d.ts`

### Directories
- Use **camelCase** for feature directories: `dataMapper`, `funcCoreTools`
- Use **PascalCase** for step/wizard directories: `CodeProjectBase`
- Use **lowercase** for utility directories: `utils`, `commands`
- Test directories should be named `__test__` or `__tests__`

### Configuration Files
- **Build configs**: Use descriptive names like `tsup.config.ts`, `vitest.config.ts`
- **Extension configs**: `.vscode/` folder for workspace-specific settings
- **Type definitions**: Place in `src/types/` with descriptive names
- **Mock files**: Place in `__mocks__/` with same structure as mocked modules

### Current Issues and Recommendations

**❌ Current Problems:**
```
src/constants.ts          // Should be CONSTANTS.ts or constants/index.ts
src/app/commands/         // Mixed naming conventions
```

**✅ Recommended Structure:**
```
src/
├── constants/
│   ├── index.ts          // Main constants
│   ├── commands.ts       // Command-specific constants
│   └── files.ts          // File name constants
├── types/
│   ├── index.ts          // Main type exports
│   └── extension.ts      // Extension-specific types
├── commands/
│   ├── logicApp/         // Logic app commands
│   ├── deployment/       // Deployment commands
│   └── dataMapper/       // Data mapper commands
```

## TypeScript Coding Standards

### Type Definitions

**✅ Use explicit interfaces for all public APIs:**
```typescript
interface ILogicAppConfig {
  readonly name: string;
  readonly resourceGroup: string;
  readonly subscriptionId: string;
  readonly location: string;
}

interface IExtensionContext {
  readonly workspaceFolder: WorkspaceFolder;
  readonly outputChannel: OutputChannel;
}
```

**✅ Use type imports for better tree-shaking:**
```typescript
import type { IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { WebviewPanel, ExtensionContext } from 'vscode';
```

**✅ Use const assertions for immutable data:**
```typescript
export const WorkflowType = {
  stateful: 'Stateful-Codeless',
  stateless: 'Stateless-Codeless',
  agentic: 'Agentic-Codeless',
} as const;

export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType];
```

### Function and Method Standards

**✅ Use async/await instead of Promises:**
```typescript
// Good
async function deployLogicApp(context: IActionContext): Promise<void> {
  try {
    const result = await azureClient.deploy();
    return result;
  } catch (error) {
    throw new Error(`Deployment failed: ${parseError(error).message}`);
  }
}
```

**✅ Use proper error handling with typed errors:**
```typescript
class LogicAppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LogicAppError';
  }
}
```

**✅ Use JSDoc for all public methods:**
```typescript
/**
 * Creates a new Logic App workflow in Azure
 * @param context - The action context from VS Code
 * @param name - The name of the workflow to create
 * @param resourceGroup - The target resource group
 * @returns Promise that resolves when workflow is created
 * @throws {LogicAppError} When creation fails
 */
async function createWorkflow(
  context: IActionContext,
  name: string,
  resourceGroup: string
): Promise<Site> {
  // Implementation
}
```

### Class Design Standards

**✅ Use composition over inheritance:**
```typescript
class LogicAppService {
  constructor(
    private readonly azureClient: AzureClient,
    private readonly logger: ILogger
  ) {}

  async deploy(config: ILogicAppConfig): Promise<void> {
    // Implementation
  }
}
```

**✅ Use readonly properties where appropriate:**
```typescript
export class ExtensionState {
  public readonly context: ExtensionContext;
  public readonly outputChannel: OutputChannel;
  
  constructor(context: ExtensionContext) {
    this.context = context;
    this.outputChannel = window.createOutputChannel('Azure Logic Apps');
  }
}
```

### Current Issues and Improvements

**❌ Current namespace usage (discouraged):**
```typescript
// extensionVariables.ts - Current pattern
export namespace ext {
  export let context: ExtensionContext;
  export let outputChannel: IAzExtOutputChannel;
}
```

**✅ Recommended class-based approach:**
```typescript
export class ExtensionVariables {
  private static instance: ExtensionVariables;
  
  private constructor(
    public readonly context: ExtensionContext,
    public readonly outputChannel: IAzExtOutputChannel
  ) {}

  public static initialize(context: ExtensionContext, outputChannel: IAzExtOutputChannel): void {
    ExtensionVariables.instance = new ExtensionVariables(context, outputChannel);
  }

  public static getInstance(): ExtensionVariables {
    if (!ExtensionVariables.instance) {
      throw new Error('ExtensionVariables not initialized');
    }
    return ExtensionVariables.instance;
  }
}
```

## VS Code Extension Best Practices

### Command Registration

**✅ Use consistent command naming:**
```typescript
export const Commands = {
  // Namespace: azureLogicAppsStandard
  CREATE_LOGIC_APP: 'azureLogicAppsStandard.createLogicApp',
  DEPLOY_LOGIC_APP: 'azureLogicAppsStandard.deployLogicApp',
  OPEN_DESIGNER: 'azureLogicAppsStandard.openDesigner',
} as const;
```

**✅ Register commands with proper error handling:**
```typescript
export function registerCommands(context: ExtensionContext): void {
  const commands = [
    { command: Commands.CREATE_LOGIC_APP, handler: createLogicApp },
    { command: Commands.DEPLOY_LOGIC_APP, handler: deployLogicApp },
  ];

  for (const { command, handler } of commands) {
    const disposable = vscode.commands.registerCommand(command, async (...args) => {
      try {
        await handler(...args);
      } catch (error) {
        vscode.window.showErrorMessage(`Command failed: ${parseError(error).message}`);
        throw error;
      }
    });
    
    context.subscriptions.push(disposable);
  }
}
```

### WebView Management

**✅ Use proper WebView lifecycle management:**
```typescript
export class WebViewManager {
  private readonly panels = new Map<string, WebviewPanel>();

  public createPanel(viewType: string, title: string): WebviewPanel {
    // Close existing panel if exists
    const existing = this.panels.get(viewType);
    if (existing) {
      existing.dispose();
    }

    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [/* ... */]
      }
    );

    // Handle disposal
    panel.onDidDispose(() => {
      this.panels.delete(viewType);
    });

    this.panels.set(viewType, panel);
    return panel;
  }

  public dispose(): void {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
  }
}
```

### Tree Data Provider

**✅ Implement proper tree data provider:**
```typescript
export class LogicAppTreeProvider implements vscode.TreeDataProvider<LogicAppTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<LogicAppTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: LogicAppTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: LogicAppTreeItem): Promise<LogicAppTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }
    return element.getChildren();
  }

  refresh(element?: LogicAppTreeItem): void {
    this._onDidChangeTreeData.fire(element);
  }
}
```

## Architecture Patterns

### Dependency Injection

**✅ Use constructor injection:**
```typescript
export class LogicAppDeploymentService {
  constructor(
    private readonly azureClient: AzureClient,
    private readonly fileService: FileService,
    private readonly logger: ILogger
  ) {}
}
```

### Service Layer Pattern

**✅ Separate business logic into services:**
```typescript
// services/LogicAppService.ts
export interface ILogicAppService {
  deploy(config: DeploymentConfig): Promise<DeploymentResult>;
  validate(workflow: WorkflowDefinition): Promise<ValidationResult>;
}

export class LogicAppService implements ILogicAppService {
  // Implementation
}
```

### Command Pattern

**✅ Use command pattern for VS Code commands:**
```typescript
export abstract class BaseCommand {
  abstract execute(context: IActionContext, ...args: unknown[]): Promise<void>;
  
  protected async handleError(error: unknown): Promise<void> {
    const parsedError = parseError(error);
    await vscode.window.showErrorMessage(parsedError.message);
    throw error;
  }
}

export class CreateLogicAppCommand extends BaseCommand {
  async execute(context: IActionContext): Promise<void> {
    // Implementation
  }
}
```

## Linting and Type Checking

### Enhanced ESLint Configuration

**Recommended `.eslintrc.json` additions:**
```json
{
  "extends": ["../../.eslintrc.json"],
  "rules": {
    // VS Code Extension specific rules
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/prefer-readonly-parameter-types": "warn",
    
    // Naming conventions
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"],
        "prefix": ["I"]
      },
      {
        "selector": "typeAlias",
        "format": ["PascalCase"]
      },
      {
        "selector": "enum",
        "format": ["PascalCase"]
      },
      {
        "selector": "class",
        "format": ["PascalCase"]
      },
      {
        "selector": "method",
        "format": ["camelCase"]
      },
      {
        "selector": "function",
        "format": ["camelCase"]
      }
    ],
    
    // VS Code specific
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["vscode"],
            "message": "Use 'import * as vscode from \"vscode\"' instead"
          }
        ]
      }
    ]
  },
  "overrides": [
    {
      "files": ["*.test.ts", "*.spec.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off"
      }
    }
  ]
}
```

### Enhanced TypeScript Configuration

**Recommended `tsconfig.json` improvements:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "../../dist/out-tsc",
    "baseUrl": ".",
    "paths": {
      "@/commands/*": ["src/app/commands/*"],
      "@/utils/*": ["src/app/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist/**/*"]
}
```

### Improved Build Configuration

**Enhanced `tsup.config.ts`:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  target: 'node16',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'vscode',
    '@azure/*',
    '@microsoft/*'
  ],
  keepNames: true,
  minify: false, // Keep readable for debugging
  
  async onSuccess() {
    const { execSync } = await import('child_process');
    
    console.log('🔍 Running type check...');
    execSync('tsc --noEmit --pretty', { 
      stdio: 'inherit', 
      cwd: __dirname 
    });
    
    console.log('🧹 Running linter...');
    execSync('eslint . --ext ts --report-unused-disable-directives --max-warnings 0', { 
      stdio: 'inherit', 
      cwd: __dirname 
    });
    
    console.log('✅ Build and checks completed successfully!');
  }
});
```

## Testing Standards

### Unit Testing

**✅ Use descriptive test structure:**
```typescript
describe('LogicAppService', () => {
  let service: LogicAppService;
  let mockAzureClient: jest.Mocked<AzureClient>;

  beforeEach(() => {
    mockAzureClient = createMockAzureClient();
    service = new LogicAppService(mockAzureClient);
  });

  describe('deploy', () => {
    it('should deploy logic app successfully when config is valid', async () => {
      // Arrange
      const config: DeploymentConfig = {
        name: 'test-app',
        resourceGroup: 'test-rg'
      };
      mockAzureClient.deploy.mockResolvedValue({ success: true });

      // Act
      const result = await service.deploy(config);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAzureClient.deploy).toHaveBeenCalledWith(config);
    });

    it('should throw LogicAppError when deployment fails', async () => {
      // Arrange
      const config: DeploymentConfig = { name: 'test-app', resourceGroup: 'test-rg' };
      mockAzureClient.deploy.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.deploy(config))
        .rejects
        .toThrow(LogicAppError);
    });
  });
});
```

### E2E Testing

**✅ Use Page Object Model for E2E tests:**
```typescript
export class DesignerPage {
  constructor(private readonly driver: WebDriver) {}

  async openWorkflow(name: string): Promise<void> {
    const workflowItem = await this.driver.findElement(
      By.css(`[data-testid="workflow-${name}"]`)
    );
    await workflowItem.click();
  }

  async addAction(actionType: string): Promise<void> {
    const addButton = await this.driver.findElement(
      By.css('[data-testid="add-action"]')
    );
    await addButton.click();
    
    const actionButton = await this.driver.findElement(
      By.css(`[data-testid="action-${actionType}"]`)
    );
    await actionButton.click();
  }
}
```

## Error Handling

### Standardized Error Types

**✅ Define custom error hierarchy:**
```typescript
export abstract class BaseExtensionError extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'error' | 'warning' | 'info';
  
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends BaseExtensionError {
  readonly code = 'VALIDATION_ERROR';
  readonly severity = 'error' as const;
}

export class DeploymentError extends BaseExtensionError {
  readonly code = 'DEPLOYMENT_ERROR';
  readonly severity = 'error' as const;
}

export class UserCancellationError extends BaseExtensionError {
  readonly code = 'USER_CANCELLED';
  readonly severity = 'info' as const;
}
```

### Error Handling Patterns

**✅ Use consistent error handling:**
```typescript
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const parsedError = parseError(error);
    
    // Log the error
    ext.outputChannel.appendLog(`Error in ${context}: ${parsedError.message}`, parsedError);
    
    // Show user-friendly message
    const actionItems: string[] = [];
    if (parsedError.code === 'AUTHENTICATION_FAILED') {
      actionItems.push('Sign In');
    }
    
    await vscode.window.showErrorMessage(
      `${context} failed: ${parsedError.message}`,
      ...actionItems
    );
    
    throw error;
  }
}
```

## Performance Guidelines

### Lazy Loading

**✅ Use lazy loading for heavy operations:**
```typescript
export class ExtensionManager {
  private _azureClient?: AzureClient;
  
  get azureClient(): AzureClient {
    if (!this._azureClient) {
      this._azureClient = new AzureClient(this.subscriptionProvider);
    }
    return this._azureClient;
  }
}
```

### Caching

**✅ Implement proper caching:**
```typescript
export class SubscriptionCache {
  private readonly cache = new Map<string, Subscription[]>();
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private readonly cacheTimestamps = new Map<string, number>();

  async getSubscriptions(tenantId: string): Promise<Subscription[]> {
    const cached = this.cache.get(tenantId);
    const timestamp = this.cacheTimestamps.get(tenantId);
    
    if (cached && timestamp && Date.now() - timestamp < this.cacheExpiry) {
      return cached;
    }

    const subscriptions = await this.fetchSubscriptions(tenantId);
    this.cache.set(tenantId, subscriptions);
    this.cacheTimestamps.set(tenantId, Date.now());
    
    return subscriptions;
  }
}
```

### Resource Management

**✅ Proper disposal of resources:**
```typescript
export class ResourceManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  register<T extends vscode.Disposable>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }
}
```

## Documentation Standards

### Code Documentation

**✅ Use comprehensive JSDoc:**
```typescript
/**
 * Service for managing Logic App deployments
 * 
 * @example
 * ```typescript
 * const service = new DeploymentService(azureClient, logger);
 * const result = await service.deploy({
 *   name: 'my-logic-app',
 *   resourceGroup: 'my-rg'
 * });
 * ```
 * 
 * @public
 */
export class DeploymentService {
  /**
   * Deploys a Logic App to Azure
   * 
   * @param config - The deployment configuration
   * @returns Promise that resolves to deployment result
   * 
   * @throws {@link ValidationError} When configuration is invalid
   * @throws {@link DeploymentError} When deployment fails
   * 
   * @remarks
   * This method will validate the configuration before attempting deployment.
   * If validation fails, a ValidationError will be thrown.
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    // Implementation
  }
}
```

### README Requirements

Each major feature should have its own README with:
- Purpose and scope
- Usage examples
- API documentation
- Configuration options
- Troubleshooting guide

## Security Best Practices

### Localization and Internationalization

**✅ Use vscode-nls for proper localization:**
```typescript
import * as nls from 'vscode-nls';

// Initialize localization
const localize = nls.loadMessageBundle();

// Use localized strings
export function showSuccessMessage(): void {
  vscode.window.showInformationMessage(
    localize('deploymentSuccess', 'Logic App deployed successfully to {0}', resourceName)
  );
}

// Define localization keys with descriptive names
export const localizedMessages = {
  errors: {
    deploymentFailed: localize('error.deploymentFailed', 'Failed to deploy Logic App: {0}'),
    invalidConfig: localize('error.invalidConfig', 'Invalid configuration provided'),
    networkError: localize('error.networkError', 'Network connection failed')
  },
  commands: {
    openDesigner: localize('command.openDesigner', 'Open Logic App Designer'),
    deployApp: localize('command.deployApp', 'Deploy Logic App')
  },
  progress: {
    deploying: localize('progress.deploying', 'Deploying Logic App...'),
    validating: localize('progress.validating', 'Validating configuration...')
  }
};
```

**✅ Localization File Structure:**
```
Localize/
├── lang/
│   ├── strings.json          # Default (English)
│   ├── strings.es.json       # Spanish
│   ├── strings.fr.json       # French
│   ├── strings.de.json       # German
│   └── strings.ja.json       # Japanese
└── LocProject.json           # Localization project config
```

**✅ Best Practices for Localization:**
- Always use localization functions, never hardcode user-facing strings
- Use descriptive keys that indicate context: `error.deployment.failed`
- Include placeholders for dynamic content: `'Deployed {0} to {1}'`
- Test with pseudo-localization to catch layout issues
- Keep strings concise but informative
- Use consistent terminology across the extension

### Security Best Practices

### Input Validation

**✅ Validate all inputs:**
```typescript
export function validateWorkflowName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Workflow name cannot be empty');
  }
  
  if (name.length > 80) {
    throw new ValidationError('Workflow name cannot exceed 80 characters');
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    throw new ValidationError('Workflow name can only contain letters, numbers, hyphens, and underscores');
  }
}
```

### Secrets Management

**✅ Use VS Code's secret storage:**
```typescript
export class SecretManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async storeSecret(key: string, value: string): Promise<void> {
    await this.context.secrets.store(key, value);
  }

  async getSecret(key: string): Promise<string | undefined> {
    return await this.context.secrets.get(key);
  }

  async deleteSecret(key: string): Promise<void> {
    await this.context.secrets.delete(key);
  }
}
```

### Telemetry and Monitoring

**✅ Structured Telemetry Collection:**
```typescript
// src/utils/telemetry.ts
export interface ITelemetryEvent {
  eventName: string;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
  errorDetails?: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
  };
}

export class TelemetryService {
  static logEvent(event: ITelemetryEvent): void {
    ext.context.telemetry.sendTelemetryEvent(
      event.eventName,
      event.properties,
      event.measurements
    );
  }
  
  static logError(
    operation: string, 
    error: Error, 
    properties?: Record<string, string>
  ): void {
    this.logEvent({
      eventName: `${operation}.error`,
      properties: {
        ...properties,
        errorType: error.constructor.name,
        errorMessage: error.message
      },
      errorDetails: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        stackTrace: error.stack
      }
    });
  }
  
  static logPerformance(
    operation: string,
    duration: number,
    properties?: Record<string, string>
  ): void {
    this.logEvent({
      eventName: `${operation}.performance`,
      properties,
      measurements: {
        duration,
        timestamp: Date.now()
      }
    });
  }
}

// Usage in commands
export async function deployLogicApp(context: IActionContext): Promise<void> {
  const startTime = performance.now();
  
  try {
    TelemetryService.logEvent({
      eventName: 'deploy.started',
      properties: {
        projectType: getProjectType(),
        region: context.location?.name
      }
    });
    
    await performDeployment();
    
    const duration = performance.now() - startTime;
    TelemetryService.logPerformance('deploy', duration, {
      success: 'true',
      projectType: getProjectType()
    });
    
  } catch (error) {
    TelemetryService.logError('deploy', error as Error, {
      projectType: getProjectType(),
      region: context.location?.name
    });
    throw error;
  }
}
```

**✅ Privacy-Compliant Telemetry Best Practices:**
- Never log personally identifiable information (PII)
- Hash or anonymize sensitive data before logging
- Respect user's telemetry preferences from VS Code settings
- Provide clear opt-out mechanisms in extension settings
- Log structured data for better analysis and debugging
- Include correlation IDs for tracing related events
- Use appropriate log levels (info, warning, error)
- Sanitize file paths and remove user-specific information

### Authentication and Authorization

**✅ Azure Authentication Patterns:**
```typescript
// src/auth/azureAuth.ts
import { AuthenticationSession, authentication } from 'vscode';

export class AzureAuthService {
  private static readonly PROVIDER_ID = 'microsoft';
  private static readonly SCOPES = ['https://management.azure.com/.default'];
  
  static async getAuthSession(): Promise<AuthenticationSession | undefined> {
    try {
      const session = await authentication.getSession(
        this.PROVIDER_ID,
        this.SCOPES,
        { createIfNone: false }
      );
      
      if (!session) {
        // Prompt user for authentication
        return await authentication.getSession(
          this.PROVIDER_ID,
          this.SCOPES,
          { createIfNone: true }
        );
      }
      
      return session;
    } catch (error) {
      TelemetryService.logError('auth.getSession', error as Error);
      throw new Error(`Authentication failed: ${error}`);
    }
  }
  
  static async getAccessToken(): Promise<string> {
    const session = await this.getAuthSession();
    if (!session) {
      throw new Error('No authentication session available');
    }
    return session.accessToken;
  }
  
  static async signOut(): Promise<void> {
    const sessions = await authentication.getSessions(this.PROVIDER_ID);
    for (const session of sessions) {
      await authentication.removeSession(this.PROVIDER_ID, session.id);
    }
  }
}

// Usage in Azure operations
export async function listSubscriptions(): Promise<Subscription[]> {
  const token = await AzureAuthService.getAccessToken();
  const credential = new AccessToken(token);
  
  const client = new SubscriptionClient(credential);
  return client.subscriptions.list();
}
```

**✅ Token Management Best Practices:**
```typescript
// src/auth/tokenManager.ts
export class TokenManager {
  private static tokenCache = new Map<string, {
    token: string;
    expiresAt: number;
  }>();
  
  static async getCachedToken(scope: string): Promise<string | null> {
    const cached = this.tokenCache.get(scope);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }
    
    // Clean up expired token
    if (cached) {
      this.tokenCache.delete(scope);
    }
    
    return null;
  }
  
  static cacheToken(scope: string, token: string, expiresIn: number): void {
    const expiresAt = Date.now() + (expiresIn * 1000) - 30000; // 30s buffer
    this.tokenCache.set(scope, { token, expiresAt });
  }
  
  static clearCache(): void {
    this.tokenCache.clear();
  }
}
```

**✅ Secure API Client Patterns:**
```typescript
// src/clients/azureClient.ts
export class SecureAzureClient {
  private credential: TokenCredential;
  
  constructor() {
    this.credential = new VSCodeCredential();
  }
  
  async makeSecureRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.credential.getToken(AzureAuthService.SCOPES[0]);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
        'User-Agent': getUserAgent(),
        ...options.headers
      }
    });
    
    if (!response.ok) {
      TelemetryService.logError('api.request', new Error(`HTTP ${response.status}`), {
        url: sanitizeUrl(url),
        status: response.status.toString()
      });
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    return response.json();
  }
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}
```

**✅ Authorization Best Practices:**
- Always validate authentication state before performing sensitive operations
- Use VS Code's built-in authentication providers when possible
- Implement token caching with proper expiration handling
- Never store tokens in plain text or unsecured locations
- Sanitize URLs and remove sensitive data from logs
- Implement proper error handling for authentication failures
- Use role-based access control (RBAC) when available
- Validate user permissions before executing operations
- Implement graceful degradation for unauthenticated users

### Debugging and Troubleshooting

**✅ Debug Configuration Setup:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: compile",
      "env": {
        "VSCODE_DEBUG_MODE": "true",
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index",
        "--disable-extensions"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

**✅ Comprehensive Logging Strategy:**
```typescript
// src/utils/logger.ts
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export class Logger {
  private static outputChannel = window.createOutputChannel('Logic Apps');
  private static logLevel = LogLevel.INFO;
  
  static setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  static error(message: string, error?: Error, context?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      const formatted = this.formatMessage('ERROR', message, error, context);
      this.outputChannel.appendLine(formatted);
      console.error(formatted, error);
    }
  }
  
  static warn(message: string, context?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      const formatted = this.formatMessage('WARN', message, undefined, context);
      this.outputChannel.appendLine(formatted);
      console.warn(formatted);
    }
  }
  
  static info(message: string, context?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      const formatted = this.formatMessage('INFO', message, undefined, context);
      this.outputChannel.appendLine(formatted);
      console.info(formatted);
    }
  }
  
  static debug(message: string, context?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message, undefined, context);
      this.outputChannel.appendLine(formatted);
      console.debug(formatted);
    }
  }
  
  static trace(message: string, context?: any): void {
    if (this.logLevel >= LogLevel.TRACE) {
      const formatted = this.formatMessage('TRACE', message, undefined, context);
      this.outputChannel.appendLine(formatted);
      console.trace(formatted);
    }
  }
  
  private static formatMessage(
    level: string,
    message: string,
    error?: Error,
    context?: any
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` | Error: ${error.message}\n${error.stack}` : '';
    
    return `[${timestamp}] [${level}] ${message}${contextStr}${errorStr}`;
  }
  
  static show(): void {
    this.outputChannel.show();
  }
  
  static clear(): void {
    this.outputChannel.clear();
  }
}
```

**✅ Error Boundary and Recovery Patterns:**
```typescript
// src/utils/errorHandler.ts
export class ErrorHandler {
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debug(`Attempting operation, try ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Operation failed on attempt ${attempt}`, {
          error: lastError.message,
          attempt,
          maxRetries
        });
        
        if (attempt < maxRetries) {
          await this.delay(delayMs * attempt); // Exponential backoff
        }
      }
    }
    
    Logger.error('Operation failed after all retries', lastError, {
      maxRetries,
      finalAttempt: maxRetries
    });
    
    throw lastError!;
  }
  
  static async handleUserFacingError(
    error: Error,
    operation: string,
    showToUser: boolean = true
  ): Promise<void> {
    Logger.error(`User-facing error in ${operation}`, error);
    
    TelemetryService.logError(operation, error, {
      userFacing: 'true',
      shown: showToUser.toString()
    });
    
    if (showToUser) {
      const userMessage = this.getUserFriendlyMessage(error);
      const action = await window.showErrorMessage(
        userMessage,
        'Show Details',
        'Report Issue'
      );
      
      if (action === 'Show Details') {
        Logger.show();
      } else if (action === 'Report Issue') {
        await this.openIssueReporter(error, operation);
      }
    }
  }
  
  private static getUserFriendlyMessage(error: Error): string {
    if (error.message.includes('ENOTFOUND')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (error.message.includes('Authentication')) {
      return 'Authentication failed. Please sign in to your Azure account.';
    }
    if (error.message.includes('Permission denied')) {
      return 'Permission denied. Please check your access rights.';
    }
    
    return `An error occurred: ${error.message}`;
  }
  
  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private static async openIssueReporter(error: Error, operation: string): Promise<void> {
    const issueBody = encodeURIComponent(
      `**Operation:** ${operation}\n\n` +
      `**Error Message:** ${error.message}\n\n` +
      `**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n` +
      `**VS Code Version:** ${env.vscodeVersion}\n` +
      `**Extension Version:** ${extensions.getExtension('ms-azuretools.logic-apps')?.packageJSON?.version}\n` +
      `**OS:** ${env.platform}`
    );
    
    const issueUrl = `https://github.com/Azure/LogicAppsUX/issues/new?body=${issueBody}`;
    await env.openExternal(Uri.parse(issueUrl));
  }
}
```

**✅ Debugging Best Practices:**
- Use VS Code's built-in debugging tools with proper launch configurations
- Implement structured logging with different log levels (error, warn, info, debug, trace)
- Create dedicated output channels for different components
- Use correlation IDs to trace related operations across components
- Implement retry logic with exponential backoff for transient failures
- Provide user-friendly error messages with actionable guidance
- Include context information in error logs for better debugging
- Set up proper source maps for debugging TypeScript code
- Use conditional compilation for debug-only code
- Implement health checks and diagnostic commands for troubleshooting
```

## Development Workflow

### Package.json Configuration

**✅ Enhanced Build Scripts:**
```json
{
  "scripts": {
    "build:extension": "tsup && pnpm run copyFiles",
    "build:ui": "pnpm run build:ui:designer && pnpm run build:ui:datamapper",
    "build:ui:designer": "cd ../vs-code-react && pnpm run build:designer",
    "build:ui:datamapper": "cd ../vs-code-react && pnpm run build:datamapper",
    
    "lint": "eslint . --ext ts --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts --fix",
    "type-check": "tsc --noEmit --pretty",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    
    "test:extension-unit": "vitest run --retry=3",
    "test:extension-unit:watch": "vitest --retry=3",
    "test:extension-unit:coverage": "vitest run --coverage",
    
    "vscode:designer:e2e:ui": "pnpm run build:ui && cd dist && extest setup-and-run ../out/test/**/*.js --coverage",
    "vscode:designer:e2e:headless": "pnpm run build:ui && cd dist && extest setup-and-run ../out/test/**/*.js --coverage",
    "vscode:designer:pack": "pnpm run build:extension && vsce package --no-dependencies",
    
    "pre-commit": "pnpm run lint && pnpm run type-check && pnpm run format:check && pnpm run test:extension-unit",
    "validate": "pnpm run type-check && pnpm run lint && pnpm run test:extension-unit",
    "clean": "rimraf dist out node_modules/.cache",
    "dev": "tsup --watch"
  }
}
```

### Continuous Integration

**✅ GitHub Actions Workflow (`.github/workflows/ci.yml`):**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type checking
        run: pnpm run type-check
      
      - name: Linting
        run: pnpm run lint
      
      - name: Format check
        run: pnpm run format:check
      
      - name: Unit tests
        run: pnpm run test:extension-unit:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/cobertura-coverage.xml

  e2e-tests:
    runs-on: ubuntu-latest
    needs: quality-checks
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build extension
        run: pnpm run build:extension
      
      - name: Run E2E tests
        run: pnpm run vscode:designer:e2e:headless
        env:
          DISPLAY: ':99'
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-test-results
          path: test-results/

  build-and-package:
    runs-on: ubuntu-latest
    needs: [quality-checks, e2e-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build extension
        run: pnpm run build:extension
      
      - name: Package extension
        run: pnpm run vscode:designer:pack
      
      - name: Upload VSIX
        uses: actions/upload-artifact@v4
        with:
          name: extension-package
          path: '*.vsix'
```

### Development Environment Setup

**✅ Workspace Configuration (`.vscode/settings.json`):**
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.includeCompletionsForModuleExports": true,
  "typescript.suggest.includeAutomaticOptionalChainCompletions": true,
  
  "eslint.validate": ["typescript"],
  "eslint.format.enable": true,
  "eslint.codeAction.showDocumentation": {
    "enable": true
  },
  
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/out": true,
    "**/.vscode-test": true
  },
  
  "vitest.enable": true,
  "vitest.commandLine": "pnpm vitest",
  
  "git.ignoreLimitWarning": true,
  
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.tabSize": 2
  },
  
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.tabSize": 2
  }
}
```

### Extension Packaging

**✅ Extension Manifest (`package.json` extension fields):**
```json
{
  "publisher": "ms-azuretools",
  "displayName": "Azure Logic Apps (Standard)",
  "description": "Build and debug Logic Apps locally and deploy to Azure",
  "version": "4.0.0",
  "engines": {
    "vscode": "^1.76.0"
  },
  "categories": ["Azure", "Debuggers", "Other"],
  "keywords": ["Azure", "Logic Apps", "Workflow", "Integration"],
  
  "activationEvents": [
    "onLanguage:json",
    "workspaceContains:**/workflow.json",
    "workspaceContains:**/host.json"
  ],
  
  "main": "./dist/main.js",
  
  "contributes": {
    "commands": [
      {
        "command": "azureLogicApps.openDesigner",
        "title": "Open Designer",
        "category": "Azure Logic Apps"
      }
    ],
    "views": {
      "azure": [
        {
          "id": "azureLogicApps",
          "name": "Logic Apps",
          "when": "config.azureLogicApps.showExplorer == true"
        }
      ]
    },
    "configuration": {
      "title": "Azure Logic Apps",
      "properties": {
        "azureLogicApps.autoInstallDependencies": {
          "type": "boolean",
          "default": true,
          "description": "Automatically install required dependencies"
        }
      }
    }
  },
  
  "extensionDependencies": [
    "ms-vscode.azure-account",
    "ms-azuretools.vscode-azureresourcegroups"
  ]
}
```

### Performance Monitoring

**✅ Performance Tracking:**
```typescript
// src/utils/performance.ts
export class PerformanceTracker {
  private static readonly measurements = new Map<string, number>();
  
  static startMeasurement(operation: string): void {
    this.measurements.set(operation, performance.now());
  }
  
  static endMeasurement(operation: string): number {
    const start = this.measurements.get(operation);
    if (!start) {
      throw new Error(`No measurement started for: ${operation}`);
    }
    
    const duration = performance.now() - start;
    this.measurements.delete(operation);
    
    // Log performance metrics
    ext.context.telemetry.measurements[`${operation}Duration`] = duration;
    
    return duration;
  }
  
  static async measureAsync<T>(
    operation: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    this.startMeasurement(operation);
    try {
      return await fn();
    } finally {
      this.endMeasurement(operation);
    }
  }
}

// Usage in commands
export async function openDesigner(context: IActionContext): Promise<void> {
  await PerformanceTracker.measureAsync('openDesigner', async () => {
    // Command implementation
  });
}
```

### Pre-commit Checks

**Recommended `.vscode/tasks.json`:**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "pnpm",
      "args": ["run", "build:extension"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "lint",
      "type": "shell",
      "command": "pnpm",
      "args": ["run", "lint"],
      "group": "build"
    },
    {
      "label": "test",
      "type": "shell",
      "command": "pnpm",
      "args": ["run", "test:extension-unit"],
      "group": "test"
    },
    {
      "label": "pre-commit",
      "dependsOrder": "sequence",
      "dependsOn": ["lint", "test", "build"]
    }
  ]
}
```

### Git Hooks

**Recommended `package.json` scripts:**
```json
{
  "scripts": {
    "build:extension": "tsup && pnpm run copyFiles",
    "lint": "eslint . --ext ts --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts --fix",
    "type-check": "tsc --noEmit",
    "test:extension-unit": "vitest run --retry=3",
    "test:e2e": "pnpm run build:ui && cd dist && extest setup-and-run ../out/test/**/*.js",
    "pre-commit": "pnpm run lint && pnpm run type-check && pnpm run test:extension-unit",
    "prepare": "husky install"
  }
}
```

## Migration Plan

### Priority 1: Critical Issues
1. ✅ Enhance TypeScript configuration with stricter rules
2. ✅ Add missing type definitions for all public APIs
3. ✅ Implement proper error handling hierarchy
4. ✅ Add comprehensive JSDoc documentation

### Priority 2: Code Quality
1. 🔄 Refactor namespace usage to class-based approach
2. 🔄 Implement dependency injection pattern
3. 🔄 Add path aliases for better imports
4. 🔄 Standardize file naming conventions

### Priority 3: Testing & Documentation
1. 📋 Increase unit test coverage to >80%
2. 📋 Add E2E tests for critical workflows
3. 📋 Create feature-specific documentation
4. 📋 Implement automated performance testing

---

## Conclusion

Following these coding standards will ensure:
- **Maintainability**: Clear code structure and documentation
- **Reliability**: Proper error handling and testing
- **Performance**: Efficient resource usage and caching
- **Security**: Input validation and secret management
- **Developer Experience**: Consistent patterns and tooling

Regular reviews and updates of these standards are essential as the VS Code Extension API and TypeScript ecosystem evolve.
