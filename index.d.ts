// Extend the Cypress interface with task method
interface Cypress {
  task: <T>(event: string, payload?: T) => Promise<any>
}

// Define the Config interface for Cypress tasks
interface Config {
  env: Record<string, any> // Environment variables passed to Cypress
}

// Define the CypressEnvironment for AWS Secrets Manager (from index.d.ts)
interface CypressEnvironment {
  AWS_SSO_STRATEGY?: string // optional
  AWS_SECRETS_LOCAL_DIR?: string // optional
  awsSecretsManagerConfig?: AwsSecretsManagerConfig
  [key: string]: any // allows for additional environment variables
}

/**
 * Retrieves secrets from AWS Secrets Manager or local storage
 * @param env - The Cypress environment variables object
 * @param __dirname - The path to the Cypress configuration directory
 * @returns A promise that resolves to the updated Cypress environment variables object
 */
export function getSecretFromAWS(env: CypressEnvironment, __dirname: string): Promise<CypressEnvironment>

/**
 * Registers Cypress tasks.
 * @param on - The Cypress `on` function used to register tasks
 * @param config - The Cypress config object
 */
declare module 'cypress-aws-secrets-manager' {
  export default function (on: Cypress['task'], config: Config): void

  // Correctly export the existing updateSecret function
  export { updateSecret }
}

interface AwsSecretsManagerConfig {
  secretName: string
  region: string
  profile?: string // optional
  pathToCredentials?: string // optional
  [key: string]: any // allows for additional properties
}

interface Secrets {
  [key: string]: any // define structure for secrets as needed
}

/**
 * Creates a file path for storing secrets locally.
 * @param directory - The directory where the secret file will be stored.
 * @param secretName - The name of the secret.
 * @returns The file path for the secret.
 */
export function createFilePath(directory: string, secretName: string): string

/**
 * Writes secrets to a local JSON file.
 * @param jsonFilePath - The path to the JSON file.
 * @param secrets - The secrets to write.
 */
export function writeSecretsToFile(jsonFilePath: string, secrets: Secrets): void

/**
 * Reads local secrets from a JSON file.
 * @param jsonFilePath - The path to the JSON file.
 * @returns The secrets read from the file.
 * @throws Will throw an error if the file cannot be read or the JSON is invalid.
 */
export function getLocalSecrets(jsonFilePath: string): Secrets

/**
 * Merges environment variables with secrets.
 * @param env - The environment variables.
 * @param secrets - The secrets to merge.
 * @param source - The source from which the secrets were retrieved.
 * @returns The merged environment variables and secrets.
 */
export function updateEnvWithSecrets(env: Record<string, any>, secrets: Secrets, source: string): Record<string, any>

/**
 * Checks if an object contains all mandatory keys.
 * @param objectToControl - The object to check.
 * @param mandatoryKeys - The list of mandatory keys.
 * @throws Will throw an error if any mandatory key is missing.
 */
export function checkOnMandatoryKeys(objectToControl: Record<string, any>, mandatoryKeys: string[]): void

/**
 * Retrieves secrets from AWS Secrets Manager using a specified strategy.
 * @param strategy - The strategy to use for retrieving secrets (e.g., 'profile', 'default', etc.).
 * @param awsSecretsManagerConfig - The AWS Secrets Manager configuration.
 * @param directory - The directory for storing secrets.
 * @returns A promise that resolves to the retrieved secrets.
 * @throws Will throw an error if the secrets cannot be retrieved.
 */
export function getAwsSecrets(strategy: string, awsSecretsManagerConfig: AwsSecretsManagerConfig, directory: string): Promise<Secrets>

/**
 * Updates a secret in AWS Secrets Manager.
 * @param env - The environment variables.
 * @param secretValue - The object containing the secret name and new secret value.
 * @returns A promise that resolves to the response from AWS Secrets Manager.
 * @throws Will throw an error if the secret cannot be updated.
 */
export function updateSecret(env: Record<string, any>, secretValue: Secrets): Promise<any>
