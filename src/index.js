const chalk = require("chalk")
const path = require('path');
const fs = require('fs');
const {
    createFilePath,
    updateEnvWithSecrets,
    getLocalSecrets,
    checkOnMandatoryKeys,
    getAwsSecrets,
    writeSecretsToFile
} = require('./utils');

const separator = chalk.grey('\n====================================================================================================\n');

const MANDATORY_KEYS = ['secretName', 'region'];

async function getSecretFromAWS(env, directory) {
    const strategy = env.AWS_SSO_STRATEGY ?? 'multi';
    const awsSecretsManagerConfig = env.awsSecretsManagerConfig ?? env.AWS_SECRET_MANAGER_CONFIG;

    console.log(separator);
    console.log('Starting plugin: ' + chalk.green('cypress-aws-secrets-manager\n'));

    if (!awsSecretsManagerConfig) {
        console.log(chalk.white('⚠️  Missing awsSecretsManagerConfig in env variables. Continuing without secrets!'));
        return env;
    }

    checkOnMandatoryKeys(awsSecretsManagerConfig, MANDATORY_KEYS);

    const secretName = awsSecretsManagerConfig.secretName;
    const localDir = env?.AWS_SECRETS_LOCAL_DIR

    try {
        if (localDir) {
            const tempFilePath = createFilePath(localDir, secretName);
            const jsonFilePath = path.join(directory, tempFilePath);
            console.log(`Extracting local configurations from: "${chalk.cyan(jsonFilePath)}"\n`);
            if (fs.existsSync(jsonFilePath)) {
                const secrets = getLocalSecrets(jsonFilePath);
                return updateEnvWithSecrets(env, secrets, tempFilePath);
            } else {
                console.log(`${chalk.yellow(`⚠️  Error loading secrets: Local file not found.\n`)}${chalk.green('\nTrying to fetch secrets from AWS Secrets Manager...')}`);
                console.log(separator);
            }
        }

        const secrets = await getAwsSecrets(strategy, awsSecretsManagerConfig, directory);
        env = updateEnvWithSecrets(env, secrets, secretName);

        if (localDir) {
            const tempFilePath = createFilePath(localDir, secretName);
            const jsonFilePath = path.join(directory, tempFilePath);
            writeSecretsToFile(jsonFilePath, secrets);
            console.log(`\n\x1B[32m√ \x1B[37mSecrets saved locally in: "${chalk.cyan(jsonFilePath)}"`);
        }
    } catch (error) {
        console.log(chalk.red(`⚠️  ${error.message}`));
        throw new Error(`Uncaught error loading secrets: ${error.message}`);
    }

    return env;
};

module.exports = {
    getSecretFromAWS
};  