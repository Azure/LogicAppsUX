describe('designer: WorkflowParameters component', () => {
  beforeEach(() => cy.visit('/iframe.html?id=components-workflowparameter--standard'));
  const DATA_CY_ATTR = 'data-cy';

  it('should open on close and toggle, and process form fields', () => {
    const firstParameterHeaderName = 'ParameterOne';
    const firstHeaderSelector = `[${DATA_CY_ATTR}=${firstParameterHeaderName}-parameter-heading-button]`;

    const firstParameterId = 'first';
    const firstParameterNameSelector = `[${DATA_CY_ATTR}=${firstParameterId}-name]`;

    // Testing functionality of WorkflowParameter Dropdown Button
    cy.get(firstHeaderSelector).click();
    cy.get(firstParameterNameSelector).should('not.exist');
    cy.get(firstHeaderSelector).click();
    cy.get(firstParameterNameSelector).should('exist');

    // Testing Name Field
    cy.get(firstParameterNameSelector).clear();
    cy.get(firstParameterNameSelector).type('Hello world');

    // Testing Type Field
    cy.get(`[${DATA_CY_ATTR}=${firstParameterId}-type]`).click();
    cy.contains('Int').click();

    // Testing Default Value Field
    cy.get(`[${DATA_CY_ATTR}=${firstParameterId}-defaultValue]`).clear();
    cy.get(`[${DATA_CY_ATTR}=${firstParameterId}-defaultValue]`).type('{id= "test"}', {
      parseSpecialCharSequences: false,
    });
  });

  it('should toggle between read-only and edit modes', () => {
    const secondParameterHeaderName = 'ParameterTwo';
    const secondParameterId = 'second-name';
    const readonlyNameSelector = 'readonly-name-label';

    // Open read-only details
    cy.contains(secondParameterHeaderName).click();
    cy.get(`[${DATA_CY_ATTR}=${readonlyNameSelector}]`).should('exist');

    // Toggle close read-only details
    cy.contains(secondParameterHeaderName).click();
    cy.get(`[${DATA_CY_ATTR}=${readonlyNameSelector}]`).should('not.exist');

    // Select edit button and open edit mode
    cy.get(`[${DATA_CY_ATTR}=parameter-edit-icon-button]`).click();
    cy.get(`[${DATA_CY_ATTR}=${secondParameterId}]`).click();
  });
});
