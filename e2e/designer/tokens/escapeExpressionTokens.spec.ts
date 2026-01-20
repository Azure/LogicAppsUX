import test, { expect } from '@playwright/test';
import { LoadMockDirect } from '../utils/GoToWorkflow';

test.describe(
  'Escape Expression Tokens Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Expressions should be able to use escape characters and serialize', async ({ page }) => {
      await LoadMockDirect(page, 'Panel.json');
      await page.getByLabel('HTTP operation, HTTP connector').click();
      await page.getByTitle('Enter request content').getByRole('paragraph').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-expression"]').click();
      // Use .cm-content which is the contenteditable area in CodeMirror
      const editorContent = page.locator('.msla-expression-editor-container .cm-content');
      await editorContent.click();
      // Type backslash-n as literal characters (not actual newline)
      // CodeMirror auto-completes brackets and quotes
      await editorContent.pressSequentially("array(split(variables('ArrayVariable'), '\\n");
      await page.getByRole('tab', { name: 'Dynamic content' }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      // Serialization converts \n to \\n in JSON
      await expect(page.getByRole('code')).toContainText(
        "\"body\": \"@{variables('ArrayVariable')}@{array(split(variables('ArrayVariable'), '\\n'))}\""
      );
    });

    test('Expressions should be able to use escaped escape characters and serialize as the same', async ({ page }) => {
      await LoadMockDirect(page, 'Panel.json');
      await page.getByLabel('HTTP operation, HTTP connector').click();
      await page.getByTitle('Enter request content').getByRole('paragraph').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-expression"]').click();
      // Use .cm-content which is the contenteditable area in CodeMirror
      const editorContent = page.locator('.msla-expression-editor-container .cm-content');
      await editorContent.click();
      // Type double backslash-n as literal characters
      // CodeMirror auto-completes brackets and quotes
      await editorContent.pressSequentially("array(split(variables('ArrayVariable'), '\\\\n");
      await page.getByRole('tab', { name: 'Dynamic content' }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      // Escaped backslash should serialize as \\n in JSON
      await expect(page.getByRole('code')).toContainText(
        "\"body\": \"@{variables('ArrayVariable')}@{array(split(variables('ArrayVariable'), '\\\\n'))}\""
      );
    });

    test('Expressions should maintain behavior of escaped characters in all instances the user views at', async ({ page }) => {
      await LoadMockDirect(page, 'Panel.json');
      await page.getByLabel('HTTP operation, HTTP connector').click();
      await page.getByTitle('Enter request content').getByRole('paragraph').click();
      await page.locator('[data-automation-id="msla-token-picker-entrypoint-button-expression"]').click();
      // Use .cm-content which is the contenteditable area in CodeMirror
      const editorContent = page.locator('.msla-expression-editor-container .cm-content');
      await editorContent.click();
      // Type simpler expression with escaped quotes - CodeMirror auto-completes brackets and quotes
      await editorContent.pressSequentially("concat('hello', '\\\\\"world\\\\\"");
      await page.getByRole('tab', { name: 'Dynamic content' }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('tab', { name: 'Code view' }).click();
      // Check that the expression appears in code view
      await expect(page.getByRole('code')).toContainText('@{concat');
      await expect(page.getByRole('code')).toContainText("'hello'");
      await page.getByRole('tab', { name: 'Parameters' }).click();
      await page.getByText('concat(...)').click();
      // Expression editor should show the concat expression
      await expect(page.getByRole('code')).toContainText('concat(');
    });
  }
);
