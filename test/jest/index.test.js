const { getSecretFromAWS } = require('../../src/index')
const fs = require('fs')
const path = require('path')
const { createFilePath, updateEnvWithSecrets, getLocalSecrets, checkOnMandatoryKeys, getAwsSecrets, writeSecretsToFile } = require('../../src/utils')

const env = {
  AWS_SSO_STRATEGY: 'unset',
  AWS_SECRETS_LOCAL_DIR: 'aws-secrets',
  AWS_SECRET_MANAGER_CONFIG: {
    secretName: 'test-secret',
    region: 'us-west-2'
  }
}
const directory = '/some/directory'
const filePath = path.join(env.AWS_SECRETS_LOCAL_DIR, env.AWS_SECRET_MANAGER_CONFIG.secretName + '.json')
const fullFilePath = path.join(directory, filePath)
const localSecret = { key: 'localSecretValue' }
const remoteSecret = { key: 'remoteSecret' }

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    access: jest.fn()
  }
}))

jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  getLocalSecrets: jest.fn().mockReturnValue(localSecret),
  getAwsSecrets: jest.fn().mockResolvedValue(remoteSecret),
  writeSecretsToFile: jest.fn()
}))

describe('getSecretFromAWS', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when mandatory properties are missing', () => {
    it('AWS_SECRET_MANAGER_CONFIG: should return env and log a warn', async () => {
      const newEnv = { ...env }
      delete newEnv.AWS_SECRET_MANAGER_CONFIG
      jest.spyOn(global.console, 'warn').mockImplementation(() => {})

      const result = await getSecretFromAWS(newEnv, directory)

      expect(result).toEqual(newEnv)
      expect(console.warn).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Continuing without secrets!'))
    })

    it('AWS_SECRET_MANAGER_CONFIG.secretName: should throw an error', async () => {
      const newEnv = { ...env, AWS_SECRET_MANAGER_CONFIG: { region: 'us-west-2' } }
      await expect(getSecretFromAWS(newEnv, directory)).rejects.toThrow('The object MUST contain these mandatory properties: secretName,region')
    })

    it('AWS_SECRET_MANAGER_CONFIG.region: should throw an error', async () => {
      const newEnv = { ...env, AWS_SECRET_MANAGER_CONFIG: { secretName: 'secretName' } }
      await expect(getSecretFromAWS(newEnv, directory)).rejects.toThrow('The object MUST contain these mandatory properties: secretName,region')
    })
  })

  describe('when AWS_SECRETS_LOCAL_DIR is provided', () => {
    it('should return local secrets if file exists', async () => {
      fs.existsSync.mockReturnValue(true)
      const result = await getSecretFromAWS(env, directory)

      expect(fs.existsSync).toHaveBeenCalledWith(fullFilePath)
      expect(getLocalSecrets).toHaveBeenCalledWith(fullFilePath)
      expect(result).toEqual({ ...env, ...localSecret })
    })

    it("should console a warning and fetch secrets from AWS if file doesn't exists", async () => {
      fs.existsSync.mockReturnValue(false)
      const logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {})

      const result = await getSecretFromAWS(env, directory)

      expect(logSpy.mock.calls).toHaveLength(8)
      const lastCallArg = logSpy.mock.calls[3][0]
      expect(lastCallArg).toEqual(expect.stringContaining('Trying to fetch secrets from AWS Secrets Manager...'))
      expect(fs.existsSync).toHaveBeenCalledWith(fullFilePath)
      expect(getAwsSecrets).toHaveBeenCalledWith(expect.any(String), env.AWS_SECRET_MANAGER_CONFIG, directory)
      expect(result).toEqual({ ...env, ...remoteSecret })
    })

    it('should write secrets to file', async () => {
      await getSecretFromAWS(env, directory)

      expect(writeSecretsToFile).toHaveBeenCalledWith(fullFilePath, remoteSecret)
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Secrets saved locally in:`))
    })
  })

  describe('when AWS_SECRETS_LOCAL_DIR is not provided', () => {
    let newEnv = { ...env }
    delete newEnv.AWS_SECRETS_LOCAL_DIR

    it('should not write secrets to file', async () => {
      await getSecretFromAWS(newEnv, directory)

      expect(writeSecretsToFile).not.toHaveBeenCalled()
    })

    it('should fetch secrets from AWS', async () => {
      const result = await getSecretFromAWS(newEnv, directory)

      expect(fs.existsSync).not.toHaveBeenCalled()
      expect(getAwsSecrets).toHaveBeenCalledWith(expect.any(String), newEnv.AWS_SECRET_MANAGER_CONFIG, directory)
      expect(result).toEqual({ ...newEnv, ...remoteSecret })
    })

    it('should throw an error if there is an issue fetching AWS secrets', async () => {
      jest.spyOn(global.console, 'error').mockImplementation(() => {})
      getAwsSecrets.mockRejectedValue(new Error('AWS error'))

      await expect(getSecretFromAWS(newEnv, directory)).rejects.toThrow('Uncaught error loading secrets: AWS error')
    })
  })
})
