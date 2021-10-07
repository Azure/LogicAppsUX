describe('designer: MicrosoftLogicAppsDesigner component', () => {
  beforeEach(() => cy.visit('/iframe.html?id=components-actionbuttonv2--standard'));

  it('should render the component', () => {
    cy.get('button').invoke('attr', 'aria-label').should('eq', "I'm an action button");
  });
});
