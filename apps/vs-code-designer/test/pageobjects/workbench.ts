/**
 * Page object for VS Code Workbench interactions
 */
export class WorkbenchPage {
  /**
   * Get the VS Code workbench
   */
  async getWorkbench() {
    return await browser.getWorkbench();
  }

  /**
   * Open command palette
   */
  async openCommandPalette() {
    const workbench = await this.getWorkbench();
    return await workbench.openCommandPrompt();
  }

  /**
   * Execute a command via command palette
   */
  async executeCommand(command: string) {
    const commandPrompt = await this.openCommandPalette();
    await commandPrompt.setText(command);
    await commandPrompt.confirm();
  }

  /**
   * Open a file from the explorer
   */
  async openFile(filePath: string) {
    const workbench = await this.getWorkbench();
    const explorer = await workbench.getActivityBar().getViewControl('Explorer');
    await explorer?.openView();

    const explorerView = await workbench.getSideBar().getContent().getSection('Explorer');
    if (explorerView) {
      const fileTree = await explorerView.openItem(filePath);
      return fileTree;
    }
    throw new Error(`Could not open file: ${filePath}`);
  }

  /**
   * Get the active editor
   */
  async getActiveEditor() {
    const workbench = await this.getWorkbench();
    const editorView = workbench.getEditorView();
    return await editorView.getActiveTab();
  }

  /**
   * Get all open editors
   */
  async getOpenEditors() {
    const workbench = await this.getWorkbench();
    const editorView = workbench.getEditorView();
    return await editorView.getOpenTabs();
  }

  /**
   * Close all open editors
   */
  async closeAllEditors() {
    const workbench = await this.getWorkbench();
    const editorView = workbench.getEditorView();
    await editorView.closeAllEditors();
  }

  /**
   * Get notifications
   */
  async getNotifications() {
    const workbench = await this.getWorkbench();
    const notificationsCenter = workbench.getNotificationsCenter();
    return await notificationsCenter.getNotifications();
  }

  /**
   * Clear all notifications
   */
  async clearNotifications() {
    const workbench = await this.getWorkbench();
    const notificationsCenter = workbench.getNotificationsCenter();
    await notificationsCenter.clearAllNotifications();
  }

  /**
   * Get title bar title
   */
  async getTitle() {
    const workbench = await this.getWorkbench();
    const titleBar = workbench.getTitleBar();
    return await titleBar.getTitle();
  }

  /**
   * Wait for VS Code to be ready
   */
  async waitForReady(timeout = 30000) {
    await browser.waitUntil(
      async () => {
        try {
          const workbench = await this.getWorkbench();
          const title = await workbench.getTitleBar().getTitle();
          return title.includes('Visual Studio Code');
        } catch (_error) {
          return false;
        }
      },
      {
        timeout,
        timeoutMsg: 'VS Code workbench did not become ready within timeout',
      }
    );
  }
}
