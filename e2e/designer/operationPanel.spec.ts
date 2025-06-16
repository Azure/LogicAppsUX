import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'OperationPanel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Can collapse and expand panel with no node selected or pinned', async ({ page }) => {
      const validatePanel = async (state: 'open' | 'closed') => {
        if (state === 'open') {
          await expect(page.locator('.msla-panel-container-nested .msla-panel-select-card-container-empty')).toBeVisible();
          return;
        }

        await expect(page.locator('.msla-panel-container-nested')).not.toBeVisible();
      };

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Panel should be closed.
      await validatePanel('closed');

      // Expand the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('open');

      // Collapse the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('closed');
    });

    test('Can select a node, and collapse & expand the panel', async ({ page }) => {
      const validatePanel = async (state: 'open' | 'closed') => {
        if (state === 'open') {
          await expect(page.locator('.msla-panel-container-nested .msla-panel-border-selected')).toBeVisible();
          await expect(page.locator('.msla-panel-card-header input#Initialize_ArrayVariable-title')).toBeVisible();
          await expect(page.locator('.msla-panel-card-header button[aria-label="Unpin action"]')).not.toBeVisible();
          return;
        }

        await expect(page.locator('.msla-panel-container-nested')).not.toBeVisible();
      };

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Initialize ArrayVariable' node.
      await page.getByTestId('card-initialize_arrayvariable').click();

      // Panel should be open, with 'Initialize Variable' action.
      await validatePanel('open');

      // Collapse the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('closed');

      // Expand the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('open');
    });

    test('Can pin a node, and collapse & expand the panel', async ({ page }) => {
      const validatePanel = async (state: 'open' | 'closed') => {
        if (state === 'open') {
          await expect(page.locator('.msla-panel-container-nested .msla-panel-border-selected')).toBeVisible();
          await expect(page.locator('.msla-panel-card-header input#Initialize_ArrayVariable-title')).toBeVisible();
          await expect(page.locator('.msla-panel-card-header button[aria-label="Unpin action"]')).toBeVisible();
          return;
        }

        await expect(page.locator('.msla-panel-container-nested')).not.toBeVisible();
      };

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Initialize ArrayVariable' node.
      await page.getByTestId('card-initialize_arrayvariable').click({ button: 'right' });
      await page.getByTestId('msla-pin-menu-option').click();

      // Panel should be open, with 'Initialize Variable' action.
      await validatePanel('open');

      // Collapse the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('closed');

      // Expand the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('open');
    });

    test('Can have both selected and pinned operations open, and collapse & expand the panel', async ({ page }) => {
      const validatePanel = async (state: 'open' | 'closed') => {
        if (state === 'open') {
          // Node panel tab should be open with 'Parse JSON' node.
          await expect(page.locator('.msla-panel-border-selected .msla-panel-card-header input#Parse_JSON-title')).toBeVisible();
          await expect(
            page.locator('.msla-panel-border-selected .msla-panel-card-header button[aria-label="Unpin action"]')
          ).not.toBeVisible();

          // Node panel tab should also be open with 'Initialize Variable' action pinned.
          await expect(
            page.locator('.msla-panel-layout-pinned .msla-panel-card-header input#Initialize_ArrayVariable-title')
          ).toBeVisible();
          await expect(page.locator('.msla-panel-layout-pinned .msla-panel-card-header button[aria-label="Unpin action"]')).toBeVisible();

          return;
        }

        await expect(page.locator('.msla-panel-container-nested')).not.toBeVisible();
      };

      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Parse JSON' node.
      await page.getByTestId('card-parse_json').click();

      // Right-click on 'Initialize ArrayVariable' node, and select 'Pin' from the menu.
      await page.getByTestId('card-initialize_arrayvariable').click({ button: 'right' });
      await page.getByTestId('msla-pin-menu-option').click();

      // Panel should be open, with 'Initialize Variable' and 'Parse JSON' actions.
      await validatePanel('open');

      // Collapse the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('closed');

      // Expand the panel and verify.
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await validatePanel('open');
    });

    test('Can switch between different tabs independently in selected/pinned panels', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Parse JSON' node.
      await page.getByTestId('card-parse_json').click();

      // Right-click on 'Initialize ArrayVariable' node, and select 'Pin' from the menu.
      await page.getByTestId('card-initialize_arrayvariable').click({ button: 'right' });
      await page.getByTestId('msla-pin-menu-option').click();

      // Click on 'Settings' tab for 'Parse JSON' and on 'Code view' tab for 'Initialize ArrayVariable'.
      await page.locator('.msla-panel-border-selected #msla-node-details-panel-Parse_JSON button[value=SETTINGS]').click();
      await page.locator('.msla-panel-layout-pinned #msla-node-details-panel-Initialize_ArrayVariable button[value=CODE_VIEW]').click();

      // Operation panels should have their respective tabs open.
      await expect(page.locator('.msla-panel-border-selected .msla-setting-section').first()).toBeVisible();
      await expect(page.locator('.msla-panel-layout-pinned').getByTestId('msla-peek')).toBeVisible();
    });

    test('Should only show the panel info message when trigger type is request', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'manual' trigger.
      await page.getByTestId('card-manual').click();

      // Panel should be open, with 'manual' action.
      await expect(page.locator('.msla-panel-container-nested .msla-panel-border-selected')).toBeVisible();
      await expect(page.locator('.msla-panel-card-header input#manual-title')).toBeVisible();
      await expect(page.getByTestId('msla-panel-header-trigger-info')).toBeVisible();

      // Left-click on 'Initialize ArrayVariable' node.
      await page.getByTestId('card-initialize_arrayvariable').click();
      await expect(page.locator('.msla-panel-card-header input#Initialize_ArrayVariable-title')).toBeVisible();
      await expect(page.getByTestId('msla-panel-header-trigger-info')).not.toBeVisible();
    });
  }
);
