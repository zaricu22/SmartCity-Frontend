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
    }
  }
}

Cypress.Commands.add('interceptBuildings', (fixture = 'buildings.json') => {
  cy.intercept('GET', '**/v1/buildings/all', { fixture }).as('getBuildings');
});

Cypress.Commands.add('interceptBuilding', (id: string, fixture = 'building-detail.json') => {
  cy.intercept('GET', `**/v1/buildings/${id}`, { fixture }).as('getBuilding');
});
