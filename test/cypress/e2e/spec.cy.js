// `Cypress.env()` is deprecated since Cypress 15.10.0 and removed in Cypress 16:
// secrets and the other `env` values are read with the async `cy.env()` command.
describe('Cypress Integrations Tests', () => {

  // Configurations
  it('should have the correct baseUrl', () => {
    expect(Cypress.config('baseUrl')).to.equal('https://www.google.com');
  });

  it('should have the correct homepage environment variable', () => {
    cy.env(['homepage']).then(({ homepage }) => {
      expect(homepage).to.equal('/homepage');
    });
  });

  it('should have the correct AWS_SSO_STRATEGY environment variable', () => {
    cy.env(['AWS_SSO_STRATEGY']).then(({ AWS_SSO_STRATEGY }) => {
      expect(AWS_SSO_STRATEGY).to.equal('unset');
    });
  });

  it('should have the correct AWS_SECRETS_LOCAL_DIR environment variable', () => {
    cy.env(['AWS_SECRETS_LOCAL_DIR']).then(({ AWS_SECRETS_LOCAL_DIR }) => {
      expect(AWS_SECRETS_LOCAL_DIR).to.equal('aws-secrets');
    });
  });

  it('should have the correct AWS_SECRET_MANAGER_CONFIG environment variable', () => {
    cy.env(['AWS_SECRET_MANAGER_CONFIG']).then(({ AWS_SECRET_MANAGER_CONFIG }) => {
      expect(AWS_SECRET_MANAGER_CONFIG).to.have.property('secretName', 'secretName');
      expect(AWS_SECRET_MANAGER_CONFIG).to.have.property('region', 'region');
    });
  });

  // Secrets import

  // This example case is simply the most basic one, which is retrieving credentials locally,
  // because it is impossible to create a test that directly retrieves secrets from AWS Secret Manager, 
  // and share it to the community. 
  it('should have the imported correctly the local secret: superSecretName', () => {
    cy.env(['superSecretName']).then(({ superSecretName }) => {
      expect(superSecretName).to.equal('superSecretValue');
    });
  })

  it('should not make the secrets available through Cypress.expose()', () => {
    expect(Cypress.expose('superSecretName')).to.equal(undefined);
  })
});
