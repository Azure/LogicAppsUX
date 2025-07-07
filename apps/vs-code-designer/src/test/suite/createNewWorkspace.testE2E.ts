import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { extensionCommand } from '../../constants';

/**
 * E2E test for the createNewWorkspace command
 */
describe('CreateNewWorkspace Command E2E Test', () => {
  // Test workspace paths
  const testWorkspaceName = 'logic-apps-test-workspace';
  const testWorkspacePath = path.join('/tmp', testWorkspaceName);

  // Keep track of UI steps for debugging
  const testSteps: string[] = [];

  // Setup before all tests
  beforeAll(async () => {
    console.log('Starting createNewWorkspace E2E tests');

    // Make sure the extension is activated
    const extension = vscode.extensions.getExtension('microsoft.vscode-designer');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
    expect(extension).toBeTruthy();

    // Clean up any existing test workspace
    if (fs.existsSync(testWorkspacePath)) {
      fs.rmSync(testWorkspacePath, { recursive: true, force: true });
    }
  });

  // Cleanup after all tests
  afterAll(() => {
    // Optionally clean up test workspace when done
    // Uncomment if you want to delete the workspace after tests
    /*
    if (fs.existsSync(testWorkspacePath)) {
      fs.rmSync(testWorkspacePath, { recursive: true, force: true });
    }
    */
  });

  it.skip('should create a new Logic Apps workspace with all required files', async () => {
    // Store original UI functions
    const originalShowQuickPick = vscode.window.showQuickPick;
    const originalShowInputBox = vscode.window.showInputBox;
    const originalExecuteCommand = vscode.commands.executeCommand;

    // Keep track of all QuickPick and InputBox options for validation
    const quickPickOptions: any[][] = [];
    const inputBoxOptions: any[] = [];

    // Override vscode.window.showQuickPick to log and select options
    vscode.window.showQuickPick = async (items: any, _options?: any) => {
      const resolvedItems = await Promise.resolve(items);
      const itemLabels = Array.isArray(resolvedItems)
        ? resolvedItems.map((i) => (typeof i === 'string' ? i : i.label || i.toString()))
        : ['Promise resolving to items'];

      quickPickOptions.push(resolvedItems);
      testSteps.push(`QuickPick shown: ${itemLabels.join(', ')}`);
      console.log('QuickPick options:', itemLabels);

      // Logic for selecting different options based on context
      if (Array.isArray(resolvedItems) && resolvedItems.length > 0) {
        // Select Logic Apps option when project type is requested
        if (itemLabels.some((label) => label.includes('Logic App'))) {
          const logicAppOption = resolvedItems.find(
            (item) => (item.label && item.label.includes('Logic App')) || (typeof item === 'string' && item.includes('Logic App'))
          );

          if (logicAppOption) {
            testSteps.push(`Selected: ${logicAppOption.label || logicAppOption}`);
            return logicAppOption;
          }
        }

        // Default to first option
        testSteps.push(`Selected: ${resolvedItems[0].label || resolvedItems[0]}`);
        return resolvedItems[0];
      }

      return undefined;
    };

    // Override vscode.window.showInputBox to provide project values
    vscode.window.showInputBox = async (options?: vscode.InputBoxOptions) => {
      inputBoxOptions.push(options);
      const prompt = options?.prompt || 'No prompt';
      testSteps.push(`InputBox shown: ${prompt}`);
      console.log('InputBox prompt:', prompt);

      // Determine what's being asked and provide appropriate values
      const promptLower = prompt.toLowerCase();

      if (promptLower.includes('name') || promptLower.includes('project')) {
        testSteps.push(`Provided project name: ${testWorkspaceName}`);
        return testWorkspaceName;
      }

      if (promptLower.includes('path') || promptLower.includes('location') || promptLower.includes('folder')) {
        const parentDir = path.dirname(testWorkspacePath);
        testSteps.push(`Provided workspace path: ${parentDir}`);
        return parentDir;
      }

      // Default value
      testSteps.push('Provided default input: DefaultInput');
      return 'DefaultInput';
    };

    try {
      // Execute the command to create a new workspace
      testSteps.push('Executing createNewWorkspace command');
      await vscode.commands.executeCommand(extensionCommand.createNewWorkspace);

      // Allow time for filesystem operations to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify workspace was created
      expect(fs.existsSync(testWorkspacePath)).toBe(true);
      testSteps.push(`Workspace directory created at: ${testWorkspacePath}`);

      // Check for essential files
      const expectedFiles = ['package.json', 'host.json', 'local.settings.json'];

      // Verify each expected file exists
      for (const file of expectedFiles) {
        const filePath = path.join(testWorkspacePath, file);
        const exists = fs.existsSync(filePath);
        testSteps.push(`Checking file ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
        expect(exists).toBe(true);
      }

      // Verify package.json has essential content
      const packageJsonPath = path.join(testWorkspacePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        expect(packageJson.name).toBeDefined();
        expect(packageJson.dependencies).toBeDefined();
        testSteps.push('Package.json validated successfully');
      }
    } catch (error) {
      console.error('Test failed:', error);
      console.log('Test steps executed:');
      testSteps.forEach((step, i) => console.log(`${i + 1}. ${step}`));
      throw error;
    } finally {
      // Restore original functions
      vscode.window.showQuickPick = originalShowQuickPick;
      vscode.window.showInputBox = originalShowInputBox;
      vscode.commands.executeCommand = originalExecuteCommand;
    }
  });
});
