const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      const { setCypressEnv } = require('cypress-env')
      config = await setCypressEnv(config, __dirname)
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
