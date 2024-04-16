import { test, expect } from '@playwright/test';

test('Should serialize the workflow after deserializing it and match', async ({ page }) => {
  await page.goto('/');

  await page.locator('text=Select an option').click();
  await page.locator('button[role="option"]:has-text("Panel")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();

  const serialized: any = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const state = (window as any).DesignerStore.getState();
        resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
      }, 5000);
    });
  });

  const mock = await import('../../__mocks__/workflows/Panel.json', {
    assert: { type: 'json' }
  });

  expect({ connectionReferences: {}, parameters: {}, definition: mock.default.definition }).toEqual(serialized as any);
});

test('Should serialize the workflow after deserializing it and match with a switch statement', async ({ page }) => {
  await page.goto('/');

  await page.locator('text=Select an option').click();
  await page.locator('button[role="option"]:has-text("Switch")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();

  const serialized: any = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const state = (window as any).DesignerStore.getState();
        resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
      }, 5000);
    });
  });

  const mock = await import('../../__mocks__/workflows/Switch.json', {
    assert: { type: 'json' }
  });

  expect({ connectionReferences: {}, parameters: {}, definition: mock.default.definition }).toEqual(serialized as any);
});

test('Should serialize the workflow after deserializing it and match with some strings and keys containing unicode characters', async ({
  page,
}) => {
  await page.goto('/');

  await page.locator('text=Select an option').click();
  await page.locator('button[role="option"]:has-text("Unicode Keys")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();

  const serialized: any = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const state = (window as any).DesignerStore.getState();
        resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
      }, 5000);
    });
  });

  const mock = await import('../../__mocks__/workflows/UnicodeKeys.json', {
    assert: { type: 'json' }
  });

  expect({ connectionReferences: {}, parameters: {}, definition: mock.default.definition }).toEqual(serialized as any);
});
