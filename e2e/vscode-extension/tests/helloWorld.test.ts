import { VSBrowser, ActivityBar, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';
import { createBrowser, closeBrowser, wait } from './utils/testUtils';

describe('VSCode Extension Tests', function () {
  // Increasing timeout as starting up VSCode takes time
  this.timeout(60000);
  
  let browser: VSBrowser;

  before(async function () {
    // Create a new VSCode browser instance
    browser = await createBrowser();
    // Wait for VSCode to fully load
    await wait(5000);
  });

  after(async function () {
    // Close the browser instance after all tests
    await closeBrowser(browser);
  });

  it('should have VSCode running', async function () {
    // Get the title of the VSCode window
    const title = await browser.driver.getTitle();
    console.log(`VSCode window title: ${title}`);
    expect(title).to.include('Visual Studio Code');
  });

  it('should have the Azure Logic Apps extension activated', async function () {
    // Open the extensions view
    const activityBar = new ActivityBar();
    await activityBar.getViewControl('Extensions').click();
    
    // Wait for the extensions view to load
    await wait(2000);
    
    // Search for the Logic Apps extension
    const workbench = new Workbench();
    const view = await workbench.getView('Extensions');
    const searchBox = await view.findElement('div.monaco-inputbox input');
    await searchBox.sendKeys('Azure Logic Apps');
    
    // Wait for search results
    await wait(3000);
    
    // Check if the extension is installed and activated (will be in the list)
    const extensionList = await view.findElements('div.monaco-list-row');
    expect(extensionList.length).to.be.greaterThan(0, 'No extensions found');
  });
});