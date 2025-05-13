// index.js
const path = require('path')
const fs = require('fs')
const {
  createFilePath,
  updateEnvWithSecrets,
  getLocalSecrets,
  checkOnMandatoryKeys,
  getAwsSecrets,
  writeSecretsToFile,
  logSecrets
} = require('./utils')
const { setSilentMode } = require('./config')
const chalk = require('chalk')
const { log, info, warn, error } = require('./logger.js')

const separator = '\n' + '='.repeat(100) + '\n'
const MANDATORY_KEYS = ['secretName', 'region']

async function getSecretFromAWS(env, directory) {
  setSilentMode(env.ENV_LOG_MODE === 'silent')

  const strategy = env.AWS_SSO_STRATEGY ?? 'multi'
  const awsSecretsManagerConfig = env.awsSecretsManagerConfig ?? env.AWS_SECRET_MANAGER_CONFIG

  log(separator)
  log('Starting plugin: ' + chalk.green('cypress-aws-secrets-manager\n'))

  if (!awsSecretsManagerConfig) {
    warn('⚠️  Missing awsSecretsManagerConfig in env variables. Continuing without secrets!')
    return env
  }

  checkOnMandatoryKeys(awsSecretsManagerConfig, MANDATORY_KEYS)
  const secretName = awsSecretsManagerConfig.secretName
  const localDir = env.AWS_SECRETS_LOCAL_DIR

  try {
    if (localDir) {
      const tempFilePath = createFilePath(localDir, secretName)
      const jsonFilePath = path.join(directory, tempFilePath)
      info(`Extracting local configurations from: "${jsonFilePath}"\n`)
      if (fs.existsSync(jsonFilePath)) {
        const secrets = getLocalSecrets(jsonFilePath)
        env = updateEnvWithSecrets(env, secrets, tempFilePath)
        logSecrets(secrets, tempFilePath) // logSecrets userà internamente logger.js
        return env
      } else {
        warn(`⚠️  Error loading secrets: Local file not found.\n`)
        info('Trying to fetch secrets from AWS Secrets Manager...')
        info(separator)
      }
    }

    const secrets = await getAwsSecrets(strategy, awsSecretsManagerConfig, directory)
    env = updateEnvWithSecrets(env, secrets, secretName)
    logSecrets(secrets, secretName)

    if (localDir) {
      const tempFilePath = createFilePath(localDir, secretName)
      const jsonFilePath = path.join(directory, tempFilePath)
      writeSecretsToFile(jsonFilePath, secrets)
      info(`\n√ Secrets saved locally in: "${jsonFilePath}"`)
    }
  } catch (err) {
    error(`⚠️  ${err.message}`)
    throw new Error(`Uncaught error loading secrets: ${err.message}`)
  }

  return env
}

module.exports = { getSecretFromAWS }
