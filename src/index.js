const chalk = require("chalk");
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

    const secretName = awsSecretsManagerConfig.secretName;
    const localDir = env.AWS_SECRETS_LOCAL_DIR ?? '';
    const tempFilePath = createFilePath(localDir, secretName);
    const jsonFilePath = path.join(directory, tempFilePath);

    try {
        if (fs.existsSync(jsonFilePath)) {
            console.log(`Extracting local configurations from: "${chalk.cyan(jsonFilePath)}"\n`);
            const secrets = getLocalSecrets(jsonFilePath);
            return updateEnvWithSecrets(env, secrets, tempFilePath);
        }

        checkOnMandatoryKeys(awsSecretsManagerConfig, MANDATORY_KEYS);
        const secrets = await getAwsSecrets(strategy, awsSecretsManagerConfig, directory);
        env = updateEnvWithSecrets(env, secrets, secretName);

        if (localDir) {
            writeSecretsToFile(jsonFilePath, secrets);
        }
    } catch (error) {
        console.error(chalk.red(`⚠️  Error loading secrets: ${error.message}`));
        throw new Error(`Uncaught error loading secrets: ${error}`);
    }

    return env;
};

module.exports = {
    getSecretFromAWS
};  