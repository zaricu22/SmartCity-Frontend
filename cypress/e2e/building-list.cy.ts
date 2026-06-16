/**
 * E2E tests for the Building List page (/assets)
 *
 * Real browser + real Angular app + real routing.
 * Only the HTTP layer is stubbed via cy.intercept() so tests
 * run without a live backend.
 *
 * Run with:  npm run cypress:open   (interactive)
 *            npm run cypress:run    (headless CI)
 */
describe('Building List page', () => {
  beforeEach(() => {
    cy.interceptBuildings();
    cy.loginAs('VIEWER', '/assets');
    cy.wait('@getBuildings');
  });

  it('should display a card for each building returned by the API', () => {
    cy.get('app-building-card').should('have.length', 2);
  });

  it('should show building names on the cards', () => {
    cy.contains('City Hall').should('be.visible');
    cy.contains('Library').should('be.visible');
  });

  it('should show building locations on the cards', () => {
    cy.contains('Zone A - Main St').should('be.visible');
    cy.contains('Zone B - Oak Ave').should('be.visible');
  });

  it('should show the "No buildings found." message when the API returns an empty list', () => {
    cy.intercept('GET', '**/v1/buildings/all', []).as('emptyBuildings');
    cy.loginAs('VIEWER', '/assets');
    cy.wait('@emptyBuildings');
    cy.contains('No buildings found.').should('be.visible');
    cy.get('app-building-card').should('not.exist');
  });

  describe('Create Building dialog', () => {
    it('should open the dialog when the "+ New Building" button is clicked', () => {
      cy.get('app-create-building-dialog').should('not.exist');
      cy.contains('button', '+ New Building').click();
      cy.get('app-create-building-dialog').should('be.visible');
    });

    it('should keep the Create button disabled while inputs are empty', () => {
      cy.contains('button', '+ New Building').click();
      cy.get('app-create-building-dialog').within(() => {
        cy.contains('button', 'Create').should('be.disabled');
      });
    });

    it('should enable the Create button once both fields are filled', () => {
      cy.contains('button', '+ New Building').click();
      cy.get('app-create-building-dialog').within(() => {
        cy.get('input').first().type('School');
        cy.get('input').last().type('Zone C');
        cy.contains('button', 'Create').should('not.be.disabled');
      });
    });

    it('should POST the new building and reload the list on confirm', () => {
      cy.intercept('POST', '**/v1/buildings', { statusCode: 200, body: null }).as('createBuilding');
      cy.interceptBuildings(); // reload stub

      cy.contains('button', '+ New Building').click();
      cy.get('app-create-building-dialog').within(() => {
        cy.get('input').first().type('School');
        cy.get('input').last().type('Zone C');
        cy.contains('button', 'Create').click();
      });

      cy.wait('@createBuilding').its('request.body').should('deep.include', {
        name: 'School',
        location: 'Zone C',
      });

      cy.wait('@getBuildings');
      cy.get('app-create-building-dialog').should('not.exist');
    });

    it('should close the dialog without creating when Cancel is clicked', () => {
      cy.contains('button', '+ New Building').click();
      cy.get('app-create-building-dialog').within(() => {
        cy.contains('button', 'Cancel').click();
      });
      cy.get('app-create-building-dialog').should('not.exist');
    });
  });

  describe('Navigation', () => {
    it('should navigate to the detail page when a building card is clicked', () => {
      cy.interceptBuilding('b-1');
      cy.get('app-building-card').first().click();
      cy.url().should('include', '/assets/b-1');
    });
  });
});
