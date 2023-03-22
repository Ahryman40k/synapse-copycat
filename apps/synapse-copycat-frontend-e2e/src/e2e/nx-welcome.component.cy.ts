describe('synapse-copycat-frontend', () => {
  beforeEach(() => cy.visit('/iframe.html?id=nxwelcomecomponent--primary'));
  it('should render the component', () => {
    cy.get('synapse-copycat-nx-welcome').should('exist');
  });
});
