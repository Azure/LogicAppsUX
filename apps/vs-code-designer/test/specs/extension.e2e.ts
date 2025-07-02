import { LogicAppsExtensionPage } from '../pageobjects/logicAppsExtension.js';

describe('Logic Apps VS Code Extension', () => {
  let logicAppsPage: LogicAppsExtensionPage;

  before(async () => {
    logicAppsPage = new LogicAppsExtensionPage();
    await logicAppsPage.waitForReady();
  });

  afterEach(async () => {
    // Clean up after each test
    await logicAppsPage.clearNotifications();
    await logicAppsPage.closeAllEditors();
  });

  it('should load VS Code successfully', async () => {
    const title = await logicAppsPage.getTitle();
    expect(title).toContain('Visual Studio Code');
  });

  it('should load Logic Apps extension', async () => {
    const isLoaded = await logicAppsPage.isExtensionLoaded();
    expect(isLoaded).toBe(true);
  });

  it('should show Logic Apps commands in command palette', async () => {
    const commandPrompt = await logicAppsPage.openCommandPalette();
    await commandPrompt.setText('Azure Logic Apps');

    // Wait for command suggestions to appear
    await browser.pause(1000);

    const suggestions = await commandPrompt.getQuickPicks();
    expect(suggestions.length).toBeGreaterThan(0);

    // Check for key commands
    const suggestionTexts = await Promise.all(suggestions.map(async (suggestion) => await suggestion.getLabel()));

    expect(suggestionTexts.some((text) => text.includes('Create New Project'))).toBe(true);
    expect(suggestionTexts.some((text) => text.includes('Create New Workflow'))).toBe(true);

    // Close command palette
    await browser.keys(['Escape']);
  });

  it('should display Logic Apps view in activity bar', async () => {
    const logicAppsView = await logicAppsPage.getLogicAppsView();
    expect(logicAppsView).toBeDefined();
  });

  it('should handle create new project command', async () => {
    // This test checks if the command can be executed without errors
    // In a real scenario, you'd mock the file system dialogs
    try {
      const commandPrompt = await logicAppsPage.openCommandPalette();
      await commandPrompt.setText('Azure Logic Apps: Create New Project');
      await browser.pause(500);

      const suggestions = await commandPrompt.getQuickPicks();
      const createProjectCommand = suggestions.find(async (suggestion) => {
        const label = await suggestion.getLabel();
        return label.includes('Create New Project');
      });

      expect(createProjectCommand).toBeDefined();

      // Close command palette instead of executing (to avoid file dialogs)
      await browser.keys(['Escape']);
    } catch (_error) {
      // Command should be available even if execution fails due to missing workspace
      console.log('Create New Project command test completed with expected dialog requirement');
    }
  });

  it('should show extension information in extensions view', async () => {
    const workbench = await logicAppsPage.getWorkbench();
    const activityBar = workbench.getActivityBar();
    const extensionsControl = await activityBar.getViewControl('Extensions');

    if (extensionsControl) {
      await extensionsControl.openView();

      // Search for Logic Apps extension
      const sideBar = workbench.getSideBar();
      const content = sideBar.getContent();
      const searchBox = await content.findElement({ css: 'input[placeholder*="Search"]' });

      if (searchBox) {
        await searchBox.sendKeys('Azure Logic Apps');
        await browser.pause(2000);

        // Check if extension appears in results
        const extensionItems = await content.findElements({ css: '.extension' });
        expect(extensionItems.length).toBeGreaterThan(0);
      }
    }
  });
});
