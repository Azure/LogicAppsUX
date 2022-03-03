describe('designer: Canvas', () => {
  beforeEach(() => cy.visit('/iframe.html?id=designer-designer-composition--simple-but-big-definition'));
  const DATA_CY_ATTR = 'data-cy';

  it('should drag and drop node to correct location', () => {
    const cardTitle = 'Increment_variable_10';
    const cardSelector = `[${DATA_CY_ATTR}=card-${cardTitle}]`;

    cy.get(cardSelector).trigger('dragstart');
    cy.get('.msla-action-button-v2').first().trigger('drop');

    cy.on('window:alert', (str) => {
      expect(str).to.contain(cardTitle);
    });
  });
});
