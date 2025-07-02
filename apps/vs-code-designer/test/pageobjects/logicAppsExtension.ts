import { WorkbenchPage } from './workbench.js';

/**
 * Page object for Logic Apps extension interactions
 */
export class LogicAppsExtensionPage extends WorkbenchPage {
  /**
   * Create a new Logic App project
   */
  async createNewLogicAppProject() {
    await this.executeCommand('Azure Logic Apps: Create New Project');
  }

  /**
   * Create a new workflow
   */
  async createNewWorkflow() {
    await this.executeCommand('Azure Logic Apps: Create New Workflow');
  }

  /**
   * Open Logic Apps designer
   */
  async openDesigner(workflowName?: string) {
    if (workflowName) {
      await this.executeCommand(`Azure Logic Apps: Open Designer - ${workflowName}`);
    } else {
      await this.executeCommand('Azure Logic Apps: Open Designer');
    }

    // Wait for designer to load
    await this.waitForDesignerReady();
  }

  /**
   * Wait for Logic Apps designer to be ready
   */
  async waitForDesignerReady(timeout = 60000) {
    await browser.waitUntil(
      async () => {
        try {
          // Check if designer webview is loaded
          const editorView = (await this.getWorkbench()).getEditorView();
          const activeTab = await editorView.getActiveTab();
          if (activeTab) {
            const title = await activeTab.getTitle();
            return title.includes('Designer') || title.includes('workflow');
          }
          return false;
        } catch (_error) {
          return false;
        }
      },
      {
        timeout,
        timeoutMsg: 'Logic Apps designer did not load within timeout',
      }
    );
  }

  /**
   * Get Logic Apps view from activity bar
   */
  async getLogicAppsView() {
    const workbench = await this.getWorkbench();
    const activityBar = workbench.getActivityBar();
    const logicAppsControl = await activityBar.getViewControl('Azure Logic Apps');
    if (!logicAppsControl) {
      throw new Error('Azure Logic Apps view control not found');
    }
    await logicAppsControl.openView();
    return logicAppsControl;
  }

  /**
   * Check if extension is loaded
   */
  async isExtensionLoaded(): Promise<boolean> {
    try {
      await this.getLogicAppsView();
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get Logic Apps workspace tree items
   */
  async getWorkspaceItems() {
    await this.getLogicAppsView();
    const workbench = await this.getWorkbench();
    const sideBar = workbench.getSideBar();
    const content = sideBar.getContent();

    // Look for Logic Apps workspace section
    const sections = await content.getSections();
    for (const section of sections) {
      const title = await section.getTitle();
      if (title.includes('Logic Apps') || title.includes('Workspace')) {
        return await section.getVisibleItems();
      }
    }
    return [];
  }

  /**
   * Deploy Logic App
   */
  async deployLogicApp() {
    await this.executeCommand('Azure Logic Apps: Deploy to Logic App...');
  }

  /**
   * Start local runtime
   */
  async startLocalRuntime() {
    await this.executeCommand('Azure Logic Apps: Start Local Runtime');

    // Wait for runtime to start (check terminal output or notifications)
    await browser.waitUntil(
      async () => {
        const notifications = await this.getNotifications();
        return notifications.some(async (notification) => {
          const message = await notification.getMessage();
          return message.includes('runtime') && message.includes('started');
        });
      },
      {
        timeout: 120000, // 2 minutes for runtime to start
        timeoutMsg: 'Local runtime did not start within timeout',
      }
    );
  }

  /**
   * Stop local runtime
   */
  async stopLocalRuntime() {
    await this.executeCommand('Azure Logic Apps: Stop Local Runtime');
  }

  /**
   * Switch to webview frame (for designer interactions)
   */
  async switchToDesignerFrame() {
    // Find and switch to the designer webview frame
    const frames = await browser.findElements('css selector', 'iframe');
    for (const frame of frames) {
      try {
        await browser.switchToFrame(frame);
        // Check if this is the designer frame by looking for designer-specific elements
        const designerElements = await browser.findElements('css selector', '[data-automation-id*="designer"]');
        if (designerElements.length > 0) {
          return true;
        }
        await browser.switchToFrame(null); // Switch back to main frame
      } catch (_error) {
        await browser.switchToFrame(null); // Switch back to main frame on error
      }
    }
    return false;
  }

  /**
   * Switch back to main VS Code frame
   */
  async switchToMainFrame() {
    await browser.switchToFrame(null);
  }
}
