/**
 * E2E tests for the Building Detail page (/assets/:id)
 *
 * Real browser + real Angular app + real routing.
 * HTTP is stubbed via cy.intercept() so tests run without a live backend.
 */
describe('Building Detail page', () => {
  const BUILDING_ID = 'b-1';

  beforeEach(() => {
    cy.interceptBuilding(BUILDING_ID);
    cy.loginAs('ADMIN', `/assets/${BUILDING_ID}`);
    cy.wait('@getBuilding');
  });

  describe('Initial render', () => {
    it('should display the building name', () => {
      cy.contains('City Hall').should('be.visible');
    });

    it('should display the building location', () => {
      cy.contains('Zone A - Main St').should('be.visible');
    });

    it('should display the current consumption', () => {
      cy.contains('50').should('be.visible');
      cy.contains('kW').should('be.visible');
    });

    it('should display the device list', () => {
      cy.get('.device-list__item').should('have.length', 1);
      cy.get('.device-list__item').first().should('contain.text', 'SOLAR');
    });
  });

  describe('Add Device dialog', () => {
    it('should open the dialog when the "+ Add Device" button is clicked', () => {
      cy.get('app-add-device-dialog').should('not.exist');
      cy.contains('button', '+ Add Device').click();
      cy.get('app-add-device-dialog').should('be.visible');
    });

    it('should keep the Add button disabled when capacity is 0', () => {
      cy.contains('button', '+ Add Device').click();
      cy.get('app-add-device-dialog').within(() => {
        cy.contains('button', 'Add').should('be.disabled');
      });
    });

    it('should enable the Add button when a positive capacity is entered', () => {
      cy.contains('button', '+ Add Device').click();
      cy.get('app-add-device-dialog').within(() => {
        cy.get('input[type=number]').clear().type('150');
        cy.contains('button', 'Add').should('not.be.disabled');
      });
    });

    it('should POST to /devices and reload the building on confirm', () => {
      cy.intercept('POST', `**/v1/buildings/${BUILDING_ID}/devices`, {
        statusCode: 200,
        body: null,
      }).as('addDevice');

      cy.intercept('GET', `**/v1/buildings/${BUILDING_ID}`, {
        fixture: 'building-detail-after-device.json',
      }).as('getUpdatedBuilding');

      cy.contains('button', '+ Add Device').click();
      cy.get('app-add-device-dialog').within(() => {
        cy.get('select').first().select('BATTERY');
        cy.get('input[type=number]').clear().type('200');
        cy.contains('button', 'Add').click();
      });

      cy.wait('@addDevice').its('request.body').should('deep.include', {
        type: 'BATTERY',
        ratedCapacityValue: 200,
      });

      cy.wait('@getUpdatedBuilding');
      cy.get('app-add-device-dialog').should('not.exist');
      cy.get('.device-list__item').should('have.length', 2);
    });

    it('should close the dialog without posting when Cancel is clicked', () => {
      cy.contains('button', '+ Add Device').click();
      cy.get('app-add-device-dialog').within(() => {
        cy.contains('button', 'Cancel').click();
      });
      cy.get('app-add-device-dialog').should('not.exist');
    });
  });

  describe('Change Consumption', () => {
    it('should PUT to /consumption and reload the building on update', () => {
      cy.intercept('PUT', `**/v1/buildings/${BUILDING_ID}/consumption`, {
        statusCode: 200,
        body: null,
      }).as('changeConsumption');

      cy.intercept('GET', `**/v1/buildings/${BUILDING_ID}`, {
        fixture: 'building-detail.json',
      }).as('reloadBuilding');

      cy.get('.building-detail-page__change-consumption').within(() => {
        cy.get('input[type=number]').clear().type('80');
        cy.contains('button', 'Update').click();
      });

      cy.wait('@changeConsumption').its('request.body').should('deep.include', {
        consumptionValue: 80,
        consumptionUnit: 'kW',
      });

      cy.wait('@reloadBuilding');
    });
  });
});
