import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'TabFocus Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should tab through the workflow properly', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');
      const tab = async () => page.locator('*:focus').press('Tab');

      await page.goto('/');
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Find element with text 'Recurrence'
      await page.getByText('Recurrence', { exact: true }).click();
      // Focus should be on the close button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Close');
      // Close node panel
      await page.locator('body').press('Enter');
      // Focus should be on the first node again
      expect(await page.locator('*:focus').innerText()).toBe('Recurrence');
      await tab();
      await tab();
      // Focus should be on the switch node
      expect(await page.locator('*:focus').innerText()).toBe('Switch');
      await tab();
      // Focus should be on the switch close button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Collapse');
      await tab();
      // Focus should be on the first switch case
      expect(await page.locator('*:focus').innerText()).toBe('Conditional Case');
      await tab();
      await tab();
      // Focus should be on the edge between the switch case and the condition node
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Insert a new step between Conditional Case and Condition');
      await tab();
      await tab();
      await tab();
      // Focus should be on the 'true' subgraph card
      expect(await page.locator('*:focus').innerText()).toContain('True');
      await tab();
      await tab();
      // Should be the first terminate node
      expect(await page.locator('*:focus').innerText()).toBe('Terminate');
    });

    test('Should open node details panel with proper focus', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');
      const tab = async () => page.locator('*:focus').press('Tab');
      const backTab = async () => page.locator('*:focus').press('Shift+Tab');

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Find element with text 'manual'
      await page.getByText('manual', { exact: true }).click();
      // Focus should be on the close button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Close');
      await backTab();
      await backTab();
      // Focus should be on the node name textfield
      expect(await page.locator('*:focus').getAttribute('value')).toBe('manual');
      // Delete one character
      await page.locator('*:focus').press('ArrowRight');
      await page.locator('*:focus').press('Backspace');
      // Focus should be on the node name textfield
      expect(await page.locator('*:focus').getAttribute('value')).toBe('manua');
      await tab();
      await tab();
      // Focus should be on the close button
      expect(await page.locator('*:focus').getAttribute('aria-label')).toBe('Close');
      // Close node panel
      await page.locator('body').press('Enter');
    });

    test('Should focus toolbar controls after workflow elements', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');

      await page.goto('/');
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Wait for workflow to load
      await page.waitForSelector('.react-flow__node');

      // Start by focusing on the canvas/workflow area
      const canvas = page.locator('.react-flow');
      await canvas.click();

      // Tab through elements and track what we encounter
      const toolbarAriaLabels = [
        'Collapse all',
        'Expand all',
        'Zoom in',
        'Zoom out',
        'Zoom view to fit',
        'Search workflow actions',
        'Toggle minimap',
      ];

      let foundWorkflowElement = false;
      let foundToolbarAfterWorkflow = false;

      // Tab through elements (max 150 tabs to prevent infinite loop)
      for (let i = 0; i < 150; i++) {
        await page.keyboard.press('Tab');

        // Small wait to let focus settle
        await page.waitForTimeout(50);

        const focusedElement = page.locator('*:focus');
        const count = await focusedElement.count();
        if (count === 0) continue;

        const ariaLabel = await focusedElement.getAttribute('aria-label').catch(() => null);
        const classList = await focusedElement.evaluate((el) => el.className).catch(() => '');

        // Check if we're on a workflow node or edge
        if (classList.includes('react-flow__node') || classList.includes('msla-') || classList.includes('nopan')) {
          foundWorkflowElement = true;
        }

        // Check if we've reached a toolbar control AFTER seeing workflow elements
        if (ariaLabel && toolbarAriaLabels.includes(ariaLabel)) {
          if (foundWorkflowElement) {
            foundToolbarAfterWorkflow = true;
          }
          break;
        }
      }

      // Verify we went through workflow elements before reaching toolbar
      expect(foundWorkflowElement).toBe(true);
      expect(foundToolbarAfterWorkflow).toBe(true);
    });

    test('Should focus toolbar controls after closing panel', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');

      await page.goto('/');
      await GoToMockWorkflow(page, 'All Scope Nodes');

      // Wait for workflow to load
      await page.waitForSelector('.react-flow__node');

      // Click on a node to open the panel
      await page.getByText('Recurrence', { exact: true }).click();

      // Wait for panel to open (focus should be on close button)
      await expect(page.locator('*:focus')).toHaveAttribute('aria-label', 'Close');

      // Close the panel with Escape
      await page.keyboard.press('Escape');

      // Wait a moment for focus to return
      await page.waitForTimeout(100);

      // Now focus on the toolbar and verify it works
      const collapseExpandButton = page.locator('#control-expand-collapse-button');
      await collapseExpandButton.focus();

      const ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(['Collapse all', 'Expand all']).toContain(ariaLabel);
    });

    test('Should be able to tab through all toolbar controls', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');
      const tab = async () => page.locator('*:focus').press('Tab');

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Focus directly on the first toolbar control
      const collapseExpandButton = page.locator('#control-expand-collapse-button');
      await collapseExpandButton.focus();

      // Verify we're on the collapse/expand button
      let ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(['Collapse all', 'Expand all']).toContain(ariaLabel);

      // Tab to zoom in
      await tab();
      ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(ariaLabel).toBe('Zoom in');

      // Tab to zoom out
      await tab();
      ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(ariaLabel).toBe('Zoom out');

      // Tab to zoom fit
      await tab();
      ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(ariaLabel).toBe('Zoom view to fit');

      // Tab to search
      await tab();
      ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(ariaLabel).toBe('Search workflow actions');

      // Tab to minimap toggle
      await tab();
      ariaLabel = await page.locator('*:focus').getAttribute('aria-label');
      expect(ariaLabel).toBe('Toggle minimap');
    });

    test('Should activate toolbar controls with keyboard', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Still working on it');

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Focus on zoom in button and press Enter
      const zoomInButton = page.locator('#control-zoom-in-button');
      await zoomInButton.focus();
      await page.keyboard.press('Enter');

      // Focus on search button and press Enter to open search panel
      const searchButton = page.locator('#control-search-button');
      await searchButton.focus();
      await page.keyboard.press('Enter');

      // Search panel should open
      await expect(page.getByPlaceholder('Search')).toBeVisible({ timeout: 5000 });

      // Press Escape to close
      await page.keyboard.press('Escape');

      // Focus on minimap toggle and press Space
      const minimapButton = page.locator('#control-minimap-button');
      await minimapButton.focus();
      await page.keyboard.press('Space');

      // Minimap should be visible
      await expect(page.locator('.react-flow__minimap')).toBeVisible({ timeout: 5000 });
    });
  }
);
