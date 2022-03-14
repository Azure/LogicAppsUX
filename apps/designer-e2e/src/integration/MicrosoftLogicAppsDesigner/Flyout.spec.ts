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

    // after manipulating the DOM to have new output, we can scan again for accessibility to check these newly rendered components
    cy.checkA11y(null, null, null, true); // Danielle to remove once accessibility bug 13821043
  });
});
