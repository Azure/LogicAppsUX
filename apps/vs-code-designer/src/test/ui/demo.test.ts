/// <reference types="mocha" />

import { expect } from 'chai';
import { VSBrowser, Workbench } from 'vscode-extension-tester';
import type { WebDriver } from 'vscode-extension-tester';

describe('VS Code Basic Functionality Test', function () {
  this.timeout(60000);

  let workbench: Workbench;
  let driver: WebDriver;

  before(async function () {
    this.timeout(120000);
    workbench = new Workbench();
    driver = VSBrowser.instance.driver;

    // Wait for VS Code to fully load
    await driver.sleep(3000);
    console.log('VS Code loaded successfully');
  });

  it('should open VS Code and verify title', async () => {
    // This is a basic smoke test that doesn't require any specific extension
    const titleBar = workbench.getTitleBar();
    const title = await titleBar.getTitle();

    expect(title).to.be.a('string');
    expect(title.length).to.be.greaterThan(0);
    console.log(`VS Code title: "${title}"`);
  });

  it('should access activity bar', async () => {
    const activityBar = workbench.getActivityBar();
    expect(activityBar).to.not.be.undefined;

    const viewControls = await activityBar.getViewControls();
    expect(viewControls.length).to.be.greaterThan(0);
    console.log(`Found ${viewControls.length} activity bar items`);
  });

  it('should access sidebar view', async () => {
    const sideBar = workbench.getSideBar();
    expect(sideBar).to.not.be.undefined;
    console.log('Sidebar is accessible');
  });

  it('should access editor view', async () => {
    const editorView = workbench.getEditorView();
    expect(editorView).to.not.be.undefined;
    console.log('Editor view is accessible');
  });

  it('should have working VS Code instance', async () => {
    // Basic smoke test to verify VS Code is running
    const windowTitle = await driver.getTitle();
    expect(windowTitle).to.be.a('string');
    expect(windowTitle.length).to.be.greaterThan(0);
    console.log(`Window title: "${windowTitle}"`);
  });
});
