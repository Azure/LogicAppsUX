describe('vs-code-overview-react/app', () => {
  beforeEach(() => {
    cy.visit('/iframe.html?id=fortesting-overview--e-2-e');
    cy.intercept('GET', 'https://baseurl/workflows/run/runs?api-version=apiversion', { fixture: 'overview/happy/get-runs.json' }).as(
      'getRuns'
    );
    cy.intercept('GET', 'https://runmorenextlink', { fixture: 'overview/happy/get-more-runs.json' }).as('getMoreRuns');

    cy.intercept(
      {
        method: 'GET', // Route all GET requests
        url: 'testurl/callbackinfo', // that have a URL that matches '/users/*'
      },
      {}
    ).as('triggerRun');

    cy.intercept(
      {
        method: 'GET', // Route all GET requests
        url: 'https://baseurl/workflows/run/runs/*', // that have a URL that matches '/users/*'
      },
      { fixture: 'overview/happy/get-run.json' }
    ).as('getRun');
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
    cy.get('[data-testid="msla-run-history-filter-input"]').type('08585565587643197854783809524CU00');
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
});
