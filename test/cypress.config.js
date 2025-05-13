const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      require('cypress-env')(on, config, __dirname)
      const { getSecretFromAWS } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      require('cypress-aws-secrets-manager/tasks')(on, config)
      return config
    }
  },
  env: {
    ENV_LOG_MODE: 'verbose'
  }
})
