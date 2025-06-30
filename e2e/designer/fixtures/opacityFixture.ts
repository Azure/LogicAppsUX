import { expect as baseExpect } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveOpacity(locator, expectedOpacity: number) {
    const assertionName = 'toHaveOpacity';
    let pass: boolean;

    try {
      await baseExpect(locator).toHaveCSS('opacity', expectedOpacity.toString(), { timeout: 5000 });
      pass = true;
    } catch (_e: any) {
      pass = false;
    }

    const actualOpacity = await locator.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });

    const message = () => {
      return (
        this.utils.matcherHint(assertionName, undefined, undefined, { isNot: this.isNot }) +
        '\n\n' +
        `Expected: ${this.isNot ? 'not ' : ''}${expectedOpacity}\n` +
        `Received: ${actualOpacity}`
      );
    };

    return {
      message,
      pass,
      name: assertionName,
      expected: expectedOpacity,
      actual: actualOpacity,
    };
  },
});
