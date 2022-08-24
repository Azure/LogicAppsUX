import { DATA_CY_ATTR } from '../shared';
import { labelCase } from '@microsoft-logic-apps/utils';

describe('designer: Canvas', () => {
  beforeEach(() => cy.visit('/iframe.html?id=designer-designer-composition--simple-but-big-definition'));

  it('should drag and drop node to correct location', () => {
    const cardTitle = 'Increment_variable_10';
    const label = labelCase(cardTitle);
    const cardSelector = `[${DATA_CY_ATTR}="card-${label}"]`;

    cy.get(cardSelector).trigger('dragstart', { force: true });
    cy.get('.msla-action-button-v2').first().trigger('drop', { force: true });
    // this will improve as we change the designer to update upon drop
    cy.on('window:alert', (str) => {
      expect(str).to.contain(cardTitle);
    });
  });
});
