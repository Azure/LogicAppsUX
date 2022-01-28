describe('designer: WorkflowParameters component', () => {
  beforeEach(() => cy.visit('/iframe.html?id=components-workflowparameter--standard'));

  it('should render the component', () => {
    // Testing functionality of WorkflowParameter Dropdown Button
    cy.get('.msla-workflow-parameter-heading-button').first().click();
    cy.get('.msla-workflow-parameter-field').should('not.exist');
    cy.get('.msla-workflow-parameter-heading-button').first().click();
    cy.get('.msla-workflow-parameter-field').should('exist');

    // Testing Name Field
    cy.get('#test1-name').clear();
    cy.get('#test1-name').type('Hello world');

    // Testing Type Field
    cy.get('#test1-type').click();
    cy.get('#test1-type-list4').click();

    // Testing Default Value Field
    cy.get('#test1-defaultValue').clear();
    cy.get('#test1-defaultValue').type('{id= "test"}', {
      parseSpecialCharSequences: false,
    });

    // Testing Edit/Delete Button
    cy.get('.msla-workflow-parameter-heading-button').last().click();
    cy.get('.msla-workflow-parameter-read-only').should('exist');
    cy.get('.edit-parameter-button').last().click();
    cy.get('.msla-workflow-parameter-read-only').should('not.exist');
  });
});
