/// <reference types="mocha" />

import { expect } from 'chai';
import { VSBrowser, Workbench, ActivityBar, EditorView } from 'vscode-extension-tester';

describe('Logic Apps Extension - Basic Smoke Tests', function () {
  this.timeout(60000);

  let workbench: Workbench;

  before(async function () {
    this.timeout(120000);
    workbench = new Workbench();

    // Wait for VS Code to fully load
    await VSBrowser.instance.driver.sleep(3000);
  });

  after(async () => {
    // Clean up any open editors
    try {
      const editorView = new EditorView();
      await editorView.closeAllEditors();
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  it('should load VS Code successfully', async () => {
    // Basic smoke test - ensure VS Code is running
    const title = await workbench.getTitleBar().getTitle();
    expect(title).to.be.a('string');
    console.log(`VS Code title: ${title}`);
  });

  it('should have activity bar with controls', async () => {
    const activityBar = new ActivityBar();
    const controls = await activityBar.getViewControls();

    expect(controls.length).to.be.greaterThan(0, 'Activity bar should have at least one control');
    console.log(`Found ${controls.length} activity bar controls`);
  });

  it('should be able to open and close command palette', async () => {
    // Open command palette
    const commandPalette = await workbench.openCommandPalette();
    expect(commandPalette).to.not.be.undefined;

    // Verify command palette is open
    const isDisplayed = await commandPalette.isDisplayed();
    expect(isDisplayed).to.be.true;

    // Close command palette
    await commandPalette.cancel();
  });

  it('should be able to search for commands in command palette', async () => {
    // Open command palette and search for basic commands
    const commandPalette = await workbench.openCommandPalette();
    await commandPalette.setText('Help');

    // Wait for suggestions to appear
    await VSBrowser.instance.driver.sleep(1000);

    // Get quick picks
    const suggestions = await commandPalette.getQuickPicks();
    expect(suggestions.length).to.be.greaterThan(0, 'Should find Help-related commands');

    console.log(`Found ${suggestions.length} Help commands`);

    await commandPalette.cancel();
  });

  it('should be able to open explorer view', async () => {
    const activityBar = new ActivityBar();

    // Try to find and open Explorer view
    const explorerControl = await activityBar.getViewControl('Explorer');
    if (explorerControl) {
      await explorerControl.openView();

      // Wait a moment for the view to open
      await VSBrowser.instance.driver.sleep(1000);

      // Verify the view is open (this is basic check)
      const isSelected = await explorerControl.isSelected();
      expect(isSelected).to.be.true;
    } else {
      console.log('Explorer control not found - this is OK for basic test');
    }
  });
});
