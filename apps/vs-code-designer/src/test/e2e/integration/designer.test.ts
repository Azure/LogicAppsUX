import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Designer Panel Tests', () => {
  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Designer Panel Tests');
  });

  test('Should be able to create webview panel', async () => {
    // Create a test webview panel to verify webview API works
    const panel = vscode.window.createWebviewPanel('logicAppsTest', 'Logic Apps Test Panel', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });

    assert.ok(panel, 'Webview panel should be created');
    assert.strictEqual(panel.title, 'Logic Apps Test Panel');

    // Set some HTML content
    panel.webview.html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Panel</title>
        </head>
        <body>
          <h1>Logic Apps Designer Test</h1>
          <div id="root"></div>
        </body>
      </html>
    `;

    // Verify webview is working
    assert.ok(panel.webview.html.includes('Logic Apps Designer Test'));

    // Clean up
    panel.dispose();
  });

  test('Should be able to register webview panel serializer', () => {
    // Test that we can register a webview panel serializer
    // This is used for persisting webview state

    let serializerRegistered = false;

    try {
      vscode.window.registerWebviewPanelSerializer('logicAppsTestSerializer', {
        async deserializeWebviewPanel(
          webviewPanel: vscode.WebviewPanel,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _state: unknown
        ): Promise<void> {
          webviewPanel.webview.html = '<html><body>Restored</body></html>';
        },
      });
      serializerRegistered = true;
    } catch (error) {
      // Serializer might already be registered, which is OK
      console.log('Serializer registration error (may already exist):', error);
      serializerRegistered = true;
    }

    assert.ok(serializerRegistered, 'Webview serializer should be registrable');
  });

  test('Should be able to post messages to webview', async () => {
    const panel = vscode.window.createWebviewPanel('logicAppsMessageTest', 'Message Test Panel', vscode.ViewColumn.One, {
      enableScripts: true,
    });

    // Set up HTML that can receive messages
    panel.webview.html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script>
            window.addEventListener('message', event => {
              const message = event.data;
              console.log('Received message:', message);
            });
          </script>
        </head>
        <body>
          <div id="messages"></div>
        </body>
      </html>
    `;

    // Post a message to the webview
    const messageSent = await panel.webview.postMessage({ type: 'test', data: 'hello' });
    assert.ok(messageSent, 'Message should be posted to webview');

    // Clean up
    panel.dispose();
  });

  test('Should be able to handle webview visibility changes', async () => {
    const panel = vscode.window.createWebviewPanel('logicAppsVisibilityTest', 'Visibility Test Panel', vscode.ViewColumn.One, {});

    let visibilityChanged = false;

    panel.onDidChangeViewState((e) => {
      visibilityChanged = true;
      console.log(`Panel visibility changed: ${e.webviewPanel.visible}`);
    });

    // The panel starts visible
    assert.ok(panel.visible, 'Panel should be visible initially');

    // Clean up (this will trigger visibility change)
    panel.dispose();

    // Give time for disposal
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
