import { expect, test } from '@playwright/test';
import axe from 'axe-core';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const named of [false, true]) {
  test(`axe ${named ? 'clears the button-name finding for a named button' : 'detects an unnamed button'}`, async ({
    page,
    browser,
  }, info) => {
    await page.setContent(named ? '<button id="target">Run report</button>' : '<button id="target"></button>');
    await page.addScriptTag({ content: axe.source });

    // This is a pinned local engine scanning a synthetic fixture, not a WCAG assessment.
    const result = await page.evaluate(async (selectedTags) => {
      const engine = (window as Window & { axe?: typeof axe }).axe;
      if (!engine) {
        throw new Error('The pinned axe engine did not load.');
      }
      const availableTags = new Set(engine.getRules().flatMap((rule) => rule.tags));
      const supportedTags = selectedTags.filter((tag) => availableTags.has(tag));
      if (supportedTags.length === 0) {
        throw new Error('The axe engine does not support any selected WCAG tags.');
      }
      const { testEngine, violations, incomplete } = await engine.run('#target', {
        runOnly: { type: 'tag', values: supportedTags },
        resultTypes: ['violations', 'incomplete'],
      });
      return { testEngine, selectedTags, supportedTags, scope: '#target', violations, incomplete };
    }, wcagTags);

    await info.attach('synthetic-axe', {
      body: JSON.stringify({ browserVersion: browser.version(), ...result }),
      contentType: 'application/json',
    });
    expect(result.violations.some(({ id }) => id === 'button-name')).toBe(!named);
  });
}

for (const restoresFocus of [false, true]) {
  test(`keyboard detects ${restoresFocus ? 'restored' : 'lost'} return focus`, async ({ page, browser }, info) => {
    // Each variant starts in its own document. Only the fixture, not the test driver, moves focus explicitly.
    await page.setContent(`
      <button id="open">Open dialog</button>
      <section id="dialog" role="dialog" aria-label="Example dialog" hidden>
        <button id="close">Close dialog</button>
      </section>
      <script>
        const opener = document.getElementById('open');
        const dialog = document.getElementById('dialog');
        const closer = document.getElementById('close');
        opener.addEventListener('click', () => {
          dialog.hidden = false;
          closer.focus();
        });
        dialog.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            dialog.hidden = true;
            ${restoresFocus ? 'opener.focus();' : ''}
          }
        });
      </script>
    `);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Open dialog' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Example dialog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dialog')).toBeHidden();

    const returnedToOpener = await page.locator('#open').evaluate((node) => node === document.activeElement);
    const activeElement = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
    await info.attach('synthetic-keyboard', {
      body: JSON.stringify({
        browserVersion: browser.version(),
        steps: [
          { key: 'Tab', focus: 'open' },
          { key: 'Enter', focus: 'close', dialogVisible: true },
          { key: 'Escape', focus: activeElement, dialogVisible: false },
        ],
        returnedToOpener,
      }),
      contentType: 'application/json',
    });
    expect(returnedToOpener).toBe(restoresFocus);
  });
}
