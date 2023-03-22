describe('synapse-copycat-frontend', () => {
  beforeEach(() => cy.visit('/iframe.html?id=appcomponent--primary'));
  it('should render the component', () => {
    cy.get('synapse-copycat-root').should('exist');
  });
});
