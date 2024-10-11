describe('Cypress Configuration Tests', () => {
  it('should have the correct baseUrl', () => {
    expect(Cypress.config('baseUrl')).to.equal('https://www.google.com');
  });

  it('should have the correct homepage environment variable', () => {
    expect(Cypress.env('homepage')).to.equal('/homepage');
  });

  it('should have the correct AWS_SSO_STRATEGY environment variable', () => {
    expect(Cypress.env('AWS_SSO_STRATEGY')).to.equal('unset');
  });

  it('should have the correct AWS_SECRETS_LOCAL_DIR environment variable', () => {
    expect(Cypress.env('AWS_SECRETS_LOCAL_DIR')).to.equal('aws-secrets');
  });

  it('should have the correct AWS_SECRET_MANAGER_CONFIG environment variable', () => {
    const AWS_SECRET_MANAGER_CONFIG = Cypress.env('AWS_SECRET_MANAGER_CONFIG');
    expect(AWS_SECRET_MANAGER_CONFIG).to.have.property('secretName', 'secretName');
    expect(AWS_SECRET_MANAGER_CONFIG).to.have.property('region', 'region');
  });

  it('should have the imported correctly the local secret: superSecretName', () => {
    expect(Cypress.env('superSecretName')).to.equal('superSecretValue');
  })

});