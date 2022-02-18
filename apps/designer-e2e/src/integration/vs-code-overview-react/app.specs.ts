describe('vs-code-overview-react/app', () => {
  beforeEach(() => {
    cy.visit('/iframe.html?id=e2e-overview--e-2-e');
  });

  it('should render', () => {
    cy.get('[data-testid="msla-overview-command-bar"] button[name="Refresh"]').should('exist');

    cy.get('[data-testid="msla-overview-command-bar"] button[name="Run trigger"]').should('exist');

    cy.get('[data-testid="msla-run-history-filter-input"]')
      .should('exist')
      .should('have.attr', 'placeholder', 'Enter the run identifier to open the run');

    cy.get('[data-automation-id="error-message"]').should('not.exist');

    cy.get('[data-testid="msla-run-history-filter-button"]').should('exist').should('have.attr', 'disabled');

    cy.get('[data-automationid="DetailsList"]').should('exist');

    cy.get('[data-testid="msla-overview-error-message"]').should('not.exist');

    cy.get('[data-testid="msla-overview-load-more"]').should('exist');

    cy.get('[data-testid="msla-overview-cors-notice"]').should('not.exist');
  });

  it('should enable the filter button if a valid run name is entered', () => {
    cy.get('[data-testid="msla-run-history-filter-input"]').type('08585565587643197854783809524CU00');
    cy.get('[data-testid="msla-run-history-filter-button"]').should('not.have.attr', 'disabled');
  });

  it('should display an error message if a run name is entered and then cleared', () => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.get('[data-testid="msla-run-history-filter-input"]')
      .type('08585565587643197854783809524CU00')
      .wait(1000) // deferredValidation set to 1000
      .clear();

    cy.get('[data-testid="msla-run-history-filter-button"]').should('have.attr', 'disabled');
    cy.get('[data-automation-id="error-message"]').should('exist');
  });

  it('should hide the "Load more" button if there are no more runs which can be fetched', () => {
    cy.get('[data-testid="msla-overview-load-more"]').click();

    cy.get('[data-testid="msla-overview-load-more"]').should('not.exist');
  });

  it('should re-render the first set of runs if Refresh is clicked', () => {
    cy.get('[data-testid="msla-overview-load-more"]').click();
    cy.get('[data-testid="msla-overview-command-bar"] button[name="Refresh"]').click();

    cy.get('[data-testid="msla-overview-load-more"]').should('exist');
  });
});
