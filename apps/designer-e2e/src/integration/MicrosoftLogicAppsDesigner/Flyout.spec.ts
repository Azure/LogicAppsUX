import { DATA_CY_ATTR, excludedRulesForComponents } from '../shared';

describe('designer: Callout', () => {
  beforeEach(() => {
    cy.visit('iframe.html?id=components-flyout--standard&viewMode=story');
    cy.injectAxe();
    cy.configureAxe({
      rules: excludedRulesForComponents,
    });
  });

  it('should open callout and pass accessibility', () => {
    const buttonId = 'callout-btn';
    const textId = 'callout-text';
    const buttonSelector = `[${DATA_CY_ATTR}=${buttonId}]`;
    const textSelector = `[${DATA_CY_ATTR}=${textId}]`;

    cy.get(buttonSelector).click();
    cy.get(textSelector).should('have.text', 'Details can be found at http://aka.ms/logicapps-chunk.'); // change this to have the same text

    // NOTE(ccastrotrejo): Disable color-contrast rule as cypress-axe library fails
    cy.checkA11y(
      {},
      {
        rules: {
          'color-contrast': { enabled: false },
        },
      }
    );
  });
});
