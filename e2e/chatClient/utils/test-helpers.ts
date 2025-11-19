/**
 * General test helpers for E2E tests
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Wait for element to be visible with retry
 */
export const waitForVisible = async (
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> => {
  await expect(locator).toBeVisible(options);
};

/**
 * Wait for element to have text
 */
export const waitForText = async (
  locator: Locator,
  text: string | RegExp,
  options?: { timeout?: number }
): Promise<void> => {
  await expect(locator).toHaveText(text, options);
};

/**
 * Wait for element to contain text
 */
export const waitForContainsText = async (
  locator: Locator,
  text: string | RegExp,
  options?: { timeout?: number }
): Promise<void> => {
  await expect(locator).toContainText(text, options);
};

/**
 * Wait for condition with polling
 */
export const waitForCondition = async (
  condition: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> => {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(message);
};

/**
 * Type text with realistic typing speed
 */
export const typeRealistic = async (
  locator: Locator,
  text: string,
  options?: { delay?: number }
): Promise<void> => {
  const delay = options?.delay ?? 50; // 50ms per character
  await locator.pressSequentially(text, { delay });
};

/**
 * Clear input and type new text
 */
export const clearAndType = async (locator: Locator, text: string): Promise<void> => {
  await locator.clear();
  await locator.fill(text);
};

/**
 * Wait for network idle
 */
export const waitForNetworkIdle = async (
  page: Page,
  options?: { timeout?: number; maxInflightRequests?: number }
): Promise<void> => {
  await page.waitForLoadState('networkidle', options);
};

/**
 * Take screenshot with name
 */
export const takeScreenshot = async (
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> => {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? false,
  });
};

/**
 * Scroll to bottom of page/element
 */
export const scrollToBottom = async (page: Page, selector?: string): Promise<void> => {
  if (selector) {
    await page.locator(selector).evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  } else {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }
};

/**
 * Wait for element count
 */
export const waitForElementCount = async (
  locator: Locator,
  count: number,
  options?: { timeout?: number }
): Promise<void> => {
  await expect(locator).toHaveCount(count, options);
};

/**
 * Get element attribute
 */
export const getAttribute = async (locator: Locator, attribute: string): Promise<string | null> => {
  return locator.getAttribute(attribute);
};

/**
 * Check if element is disabled
 */
export const isDisabled = async (locator: Locator): Promise<boolean> => {
  return locator.isDisabled();
};

/**
 * Check if element is enabled
 */
export const isEnabled = async (locator: Locator): Promise<boolean> => {
  return locator.isEnabled();
};

/**
 * Focus element
 */
export const focus = async (locator: Locator): Promise<void> => {
  await locator.focus();
};

/**
 * Blur element
 */
export const blur = async (locator: Locator): Promise<void> => {
  await locator.blur();
};

/**
 * Press keyboard key
 */
export const pressKey = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press(key);
};

/**
 * Press keyboard shortcut
 */
export const pressShortcut = async (
  page: Page,
  modifiers: string[],
  key: string
): Promise<void> => {
  const shortcut = [...modifiers, key].join('+');
  await page.keyboard.press(shortcut);
};

/**
 * Get computed style
 */
export const getComputedStyle = async (locator: Locator, property: string): Promise<string> => {
  return locator.evaluate(
    (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
    property
  );
};

/**
 * Check if element has class
 */
export const hasClass = async (locator: Locator, className: string): Promise<boolean> => {
  const classes = await locator.getAttribute('class');
  return classes?.split(' ').includes(className) ?? false;
};

/**
 * Wait for animation to complete
 */
export const waitForAnimation = async (locator: Locator): Promise<void> => {
  await locator.evaluate((el) => {
    return Promise.all(el.getAnimations().map((animation) => animation.finished));
  });
};

/**
 * Get inner text
 */
export const getInnerText = async (locator: Locator): Promise<string> => {
  return locator.innerText();
};

/**
 * Get text content
 */
export const getTextContent = async (locator: Locator): Promise<string | null> => {
  return locator.textContent();
};

/**
 * Get all inner texts
 */
export const getAllInnerTexts = async (locator: Locator): Promise<string[]> => {
  return locator.allInnerTexts();
};

/**
 * Click and wait for navigation
 */
export const clickAndNavigate = async (locator: Locator, page: Page): Promise<void> => {
  await Promise.all([page.waitForNavigation(), locator.click()]);
};

/**
 * Click and wait for response
 */
export const clickAndWaitForResponse = async (
  locator: Locator,
  page: Page,
  urlPattern: string | RegExp
): Promise<void> => {
  await Promise.all([page.waitForResponse(urlPattern), locator.click()]);
};

/**
 * Hover over element
 */
export const hover = async (locator: Locator): Promise<void> => {
  await locator.hover();
};

/**
 * Double click
 */
export const doubleClick = async (locator: Locator): Promise<void> => {
  await locator.dblclick();
};

/**
 * Right click
 */
export const rightClick = async (locator: Locator): Promise<void> => {
  await locator.click({ button: 'right' });
};

/**
 * Drag and drop
 */
export const dragAndDrop = async (source: Locator, target: Locator): Promise<void> => {
  await source.dragTo(target);
};

/**
 * Select option
 */
export const selectOption = async (locator: Locator, value: string): Promise<void> => {
  await locator.selectOption(value);
};

/**
 * Check checkbox
 */
export const check = async (locator: Locator): Promise<void> => {
  await locator.check();
};

/**
 * Uncheck checkbox
 */
export const uncheck = async (locator: Locator): Promise<void> => {
  await locator.uncheck();
};

/**
 * Upload file
 */
export const uploadFile = async (locator: Locator, filePath: string): Promise<void> => {
  await locator.setInputFiles(filePath);
};

/**
 * Get element count
 */
export const getCount = async (locator: Locator): Promise<number> => {
  return locator.count();
};

/**
 * Check if element exists (without waiting)
 */
export const exists = async (locator: Locator): Promise<boolean> => {
  return (await locator.count()) > 0;
};
