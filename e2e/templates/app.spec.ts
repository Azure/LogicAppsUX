import { expect, test } from '@playwright/test';
import { GoToMockTemplate, GoToMockTemplatesGallery } from './utils/GoToTemplate';

test.describe(
  'Sanity Check',
  {
    tag: '@mock',
  },
  () => {
    test('Should open templates gallery', async ({ page }) => {
      await page.goto('/templates');

      await GoToMockTemplatesGallery(page);

      await page.getByRole('tab', { name: 'All' }).click();
      await page.getByText('Blank workflow', { exact: true }).click();
      // await page.getByRole('tab', { name: 'Accelerators' }).click();
      // await expect(page.getByText('Blank workflow', { exact: true })).not.toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator Template', { exact: true })).toBeVisible();
      await page.getByText('A to Z, ascending').click();
      // await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByText('Blank workflow', { exact: true }).click();
      await expect(page.getByText('[Mock] Basic Workflow Only Template', { exact: true })).toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection Parameter Template', { exact: true })).toBeVisible();
    });

    test('Should open template panel', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplate(page, '[Mock] Basic Workflow Only Template');
      await page.getByRole('tab', { name: 'Workflow' }).click();
      await page.getByRole('tab', { name: 'Summary' }).click();
      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();
      await page.getByText('Stateless', { exact: true }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('Create a new workflow from template', { exact: true })).toBeVisible();
      await page.getByText('Template details').click();
      await expect(page.getByText('Workflow name')).toBeVisible();
      await expect(page.getByText('State type')).toBeVisible();
    });

    test('Should only contain the mock templates when templates are loaded from azure endpoint.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Automation', { exact: true }).click();

      await page.waitForTimeout(5);

      await expect(page.getByText('Azure Business', { exact: false })).toBeVisible();
    });

    test('Should show basics tab for consumption workflow when it is create view and tabs to be enabled.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Create View', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Mock', { exact: true }).click();
      await page.getByText('[Mock] Simple Parameters', { exact: false }).click();
      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();
      await expect(page.getByText('State type')).not.toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
    });

    test('Should show resource selection in basics tab for consumption workflow when it is create view.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Create View', { exact: true }).click();
      await page.getByText('Resource Selection', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Mock', { exact: true }).click();
      await page.getByText('[Mock] Simple Parameters', { exact: false }).click();

      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();

      const allSubs = await page.getByText('Subscription 1', { exact: true }).all();
      expect(allSubs.length).toBe(2);

      await expect(page.getByText('SecondRG', { exact: true })).toBeVisible();
      await expect(page.getByText('East US', { exact: true })).toBeVisible();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();

      await page.getByRole('tab', { name: 'Basics' }).click();
      await page.getByRole('button', { name: 'Close Panel' }).click();
      await page.getByRole('combobox', { name: 'Gallery' }).click();
      await page.getByText('Simple Parameters', { exact: true }).click();
      await page.waitForTimeout(10);

      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await expect(page.getByText('Subscription 1', { exact: true })).toBeVisible();
      await expect(page.getByText('SecondRG', { exact: true })).toBeVisible();
      await expect(page.getByText('East US', { exact: true })).toBeVisible();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
    });

    test('Should disable navigation is resource selection in basics tab is invalid.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Create View', { exact: true }).click();
      await page.getByText('Resource Selection', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Mock', { exact: true }).click();
      await page.getByText('[Mock] Simple Parameters', { exact: false }).click();

      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();

      const allSubs = await page.getByText('Subscription 1', { exact: true }).all();
      expect(allSubs.length).toBe(2);

      await allSubs[1].click();
      await page.getByText('Subscription 2', { exact: true }).click();

      await expect(page.getByText('Please select a valid resource', { exact: false })).toBeVisible();

      const button = await page.getByRole('button', { name: 'Next' });
      expect(button).toBeDisabled();

      const tab = await page.getByRole('tab', { name: 'Parameters' });
      await expect(tab).toBeDisabled();
    });

    test('Template cards should be keyboard accessible', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplatesGallery(page);

      // Get the template card by its aria-label (set on the DocumentCard)
      const templateCard = page.locator('.msla-template-card-wrapper[aria-label="[Mock] Basic Workflow Only Template"]');
      await templateCard.focus();

      // Verify the card is focusable
      await expect(templateCard).toBeFocused();

      // Press Enter to select the template
      await page.keyboard.press('Enter');

      // Verify the panel opened
      await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible();

      // Close the panel
      await page.getByRole('button', { name: 'Close Panel' }).click();

      // Verify focus returned to the card
      await expect(templateCard).toBeFocused();
    });

    test('Template cards grid should support arrow key navigation', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplatesGallery(page);

      // Focus on the first template card
      const firstCard = page.locator('.msla-template-card-wrapper[aria-label="[Mock] Basic Workflow Only Template"]');
      const secondCard = page.locator('.msla-template-card-wrapper[aria-label="[Mock] Simple Accelerator Template"]');
      const thirdCard = page.locator('.msla-template-card-wrapper[aria-label="[Mock] Simple Connection Parameter Template"]');

      await firstCard.focus();
      await expect(firstCard).toBeFocused();

      // Navigate right to the next card
      await page.keyboard.press('ArrowRight');
      await expect(secondCard).toBeFocused();

      // Navigate right again
      await page.keyboard.press('ArrowRight');
      await expect(thirdCard).toBeFocused();

      // Navigate left back to the second card
      await page.keyboard.press('ArrowLeft');
      await expect(secondCard).toBeFocused();

      // Navigate left back to the first card
      await page.keyboard.press('ArrowLeft');
      await expect(firstCard).toBeFocused();
    });

    test('Template cards should be accessible via Tab key', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplatesGallery(page);

      // Focus on the search input first
      const searchInput = page.getByPlaceholder('Search');
      await searchInput.focus();
      await expect(searchInput).toBeFocused();

      // Tab through to reach the template cards grid
      // The exact number of tabs depends on the UI, but we should eventually reach a card
      let foundCard = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        const classList = await focusedElement.getAttribute('class');
        if (classList?.includes('msla-template-card-wrapper')) {
          foundCard = true;
          break;
        }
      }

      expect(foundCard).toBe(true);
    });
  }
);
