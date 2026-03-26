// Example input for /angular-migrate-playwright — see SKILL.md for usage
// BEFORE: Cypress e2e test for the trade blotter feature
describe('Trade Blotter', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/trades', { fixture: 'trades.json' }).as('getTrades');
    cy.visit('/trades');
    cy.wait('@getTrades');
  });

  it('should display the trade blotter table', () => {
    cy.get('[data-testid="trade-table"]').should('be.visible');
    cy.get('[data-testid="trade-row"]').should('have.length', 5);
  });

  it('should filter trades by symbol', () => {
    cy.get('[data-testid="filter-input"]').type('AAPL');
    cy.get('[data-testid="trade-row"]').should('have.length', 2);
    cy.get('[data-testid="trade-row"]').first().should('contain.text', 'AAPL');
  });

  it('should open trade detail on row click', () => {
    cy.get('[data-testid="trade-row"]').first().click();
    cy.url().should('include', '/trades/');
    cy.get('[data-testid="trade-detail-panel"]').should('be.visible');
    cy.get('[data-testid="trade-symbol"]').should('have.text', 'MSFT');
  });

  it('should cancel a pending trade', () => {
    cy.intercept('DELETE', '/api/trades/*', { statusCode: 200 }).as('cancelTrade');
    cy.get('[data-testid="trade-row"]').contains('Pending').parent().find('[data-testid="cancel-btn"]').click();
    cy.get('[data-testid="confirm-dialog"]').should('be.visible');
    cy.get('[data-testid="confirm-yes"]').click();
    cy.wait('@cancelTrade');
    cy.get('[data-testid="toast-success"]').should('contain.text', 'Trade cancelled');
  });

  it('should sort trades by date', () => {
    cy.get('[data-testid="sort-date"]').click();
    cy.get('[data-testid="trade-row"]').first().should('contain.text', '2026-03-25');
    cy.get('[data-testid="sort-date"]').click();
    cy.get('[data-testid="trade-row"]').first().should('contain.text', '2026-01-10');
  });
});
