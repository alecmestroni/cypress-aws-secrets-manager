const chalk = require("chalk");

const separator = chalk.white('\n====================================================================================================\n')

module.exports = async (on, config, awsObj) => {
    if (!awsObj.secretName || !awsObj.profile || !awsObj.region) {
        console.error(chalk.red('\nConfigurationError:\n') + chalk.yellow('You must specify the "awsObj" element in the config, and it must contain this properties:\n') + chalk.white('secretName, profile, region'))
        throw new Error('You must specify the "awsObj" element in the config, and it must contain this properties:\n secretName, profile, region')
    }
    await loadAwsSecrets(config, awsObj)
    return config;
};

async function getSecretsFromAws(awsObj) {
    const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
    const { fromSSO } = require("@aws-sdk/credential-providers");
    const client = new SecretsManagerClient({
        region: awsObj.region,
        credentials: fromSSO({ profile: awsObj.profile })
    });
    const secretName = awsObj.secretName
    let response;
    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secretName,
                VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
            })
        );
    } catch (error) {
        console.log(error)
        throw error;
    }
    const secret = JSON.parse(response.SecretString)
    return secret;
}

async function loadAwsSecrets(config, awsObj) {

    console.log(separator)
    console.log('Extracting secret from: "' + chalk.cyan('AWS Secrets Manger\n'))
    const secret = await getSecretsFromAws(awsObj)
    config.env = {
        ...config.env,
        ...secret,
    }
    Object.keys(secret).forEach(key => {
        secret[key] = "".padStart(5, '*');
    });
    console.log(` - secret: "${JSON.stringify(secret, null, 4)}"`)
    console.log(chalk.green('\n√ ') + chalk.white('Secret loaded correctly from: "' + chalk.cyan(secret_name) + '"'))
}