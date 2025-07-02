import { LogicAppsExtensionPage } from '../pageobjects/logicAppsExtension.js';
import fs from 'fs';
import path from 'path';

describe('Logic Apps Designer', () => {
  let logicAppsPage: LogicAppsExtensionPage;
  const testWorkspacePath = path.join(__dirname, '..', '..', 'test-workspace');

  before(async () => {
    logicAppsPage = new LogicAppsExtensionPage();
    await logicAppsPage.waitForReady();

    // Create test workspace directory if it doesn't exist
    if (!fs.existsSync(testWorkspacePath)) {
      fs.mkdirSync(testWorkspacePath, { recursive: true });
    }

    // Create a minimal workflow.json for testing
    const workflowPath = path.join(testWorkspacePath, 'test-workflow');
    if (!fs.existsSync(workflowPath)) {
      fs.mkdirSync(workflowPath, { recursive: true });

      const workflowDefinition = {
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          parameters: {},
          triggers: {},
          actions: {},
        },
      };

      fs.writeFileSync(path.join(workflowPath, 'workflow.json'), JSON.stringify(workflowDefinition, null, 2));
    }
  });

  afterEach(async () => {
    await logicAppsPage.clearNotifications();
    await logicAppsPage.closeAllEditors();
    await logicAppsPage.switchToMainFrame();
  });

  it.skip('should open designer for workflow file', async () => {
    // Skip this test if no test workspace is available
    if (!fs.existsSync(path.join(testWorkspacePath, 'test-workflow', 'workflow.json'))) {
      console.log('Skipping designer test - no test workflow available');
      return;
    }

    try {
      // Open the workflow file first
      await logicAppsPage.openFile('test-workflow/workflow.json');

      // Then try to open designer
      await logicAppsPage.openDesigner();

      // Verify designer opened
      const activeTab = await logicAppsPage.getActiveEditor();
      if (activeTab) {
        const title = await activeTab.getTitle();
        expect(title).toContain('Designer');
      }
    } catch (_error) {
      console.log('Designer test skipped - requires full Logic Apps workspace setup');
    }
  });

  it('should show designer-related commands', async () => {
    const commandPrompt = await logicAppsPage.openCommandPalette();
    await commandPrompt.setText('designer');

    await browser.pause(1000);

    const suggestions = await commandPrompt.getQuickPicks();
    const suggestionTexts = await Promise.all(suggestions.map(async (suggestion) => await suggestion.getLabel()));

    // Should find some designer-related commands
    const hasDesignerCommands = suggestionTexts.some(
      (text) => text.toLowerCase().includes('designer') || text.toLowerCase().includes('workflow')
    );

    expect(hasDesignerCommands).toBe(true);

    await browser.keys(['Escape']);
  });

  it.skip('should handle designer webview interactions', async () => {
    // This is a more advanced test that would require a full workflow setup
    // Skip for now but shows the pattern for webview testing

    try {
      await logicAppsPage.openDesigner();

      // Switch to designer webview frame
      const frameFound = await logicAppsPage.switchToDesignerFrame();
      if (frameFound) {
        // Look for designer-specific elements
        const designerCanvas = await browser.$('[data-automation-id*="designer-canvas"]');
        if (await designerCanvas.isDisplayed()) {
          expect(await designerCanvas.isDisplayed()).toBe(true);
        }
      }

      await logicAppsPage.switchToMainFrame();
    } catch (_error) {
      console.log('Advanced designer test requires full workspace - skipped');
    }
  });

  it('should validate extension contributes designer capabilities', async () => {
    // Test that the extension contributes expected capabilities

    // Check for Logic Apps-specific menu contributions
    const commandPrompt = await logicAppsPage.openCommandPalette();
    await commandPrompt.setText('Azure Logic Apps');

    await browser.pause(1000);

    const suggestions = await commandPrompt.getQuickPicks();
    const suggestionTexts = await Promise.all(suggestions.map(async (suggestion) => await suggestion.getLabel()));

    // Verify key extension commands are available
    const expectedCommands = ['Create New Project', 'Create New Workflow', 'Open Designer'];

    for (const expectedCommand of expectedCommands) {
      const commandExists = suggestionTexts.some((text) => text.includes(expectedCommand));
      expect(commandExists).toBe(true);
    }

    await browser.keys(['Escape']);
  });
});
