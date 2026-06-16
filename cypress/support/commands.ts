// Add any custom Cypress commands here.
// Example: cy.login(), cy.seedBuildings(), etc.

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      // cy.interceptBuildings(fixture?) — stubs GET /v1/buildings/all
      interceptBuildings(fixture?: string): Chainable<void>;
      // cy.interceptBuilding(id, fixture?) — stubs GET /v1/buildings/:id
      interceptBuilding(id: string, fixture?: string): Chainable<void>;
      // cy.loginAs(role, returnUrl) — visits returnUrl, follows the authGuard/roleGuard
      // redirect to /login, clicks the stub login button, and lands back on returnUrl.
      // AuthService keeps the token in memory only (never localStorage/sessionStorage),
      // so this has to run before every cy.visit() to a protected route, not just once.
      loginAs(role: 'ADMIN' | 'VIEWER', returnUrl: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('interceptBuildings', (fixture = 'buildings.json') => {
  cy.intercept('GET', '**/v1/buildings/all', { fixture }).as('getBuildings');
});

Cypress.Commands.add('interceptBuilding', (id: string, fixture = 'building-detail.json') => {
  cy.intercept('GET', `**/v1/buildings/${id}`, { fixture }).as('getBuilding');
});

Cypress.Commands.add('loginAs', (role: 'ADMIN' | 'VIEWER', returnUrl: string) => {
  cy.visit(returnUrl);
  cy.contains('button', role === 'ADMIN' ? 'Login as Admin' : 'Login as Viewer').click();
  cy.url().should('include', returnUrl);
});
