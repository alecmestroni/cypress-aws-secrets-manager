const chalk = require("chalk");

const separator = chalk.white('\n====================================================================================================\n')

module.exports = async (on, config) => {
    if (config.awsObj) {
        const awsObj = config.awsObj
        if (!awsObj.secretName || !awsObj.profile || !awsObj.region) {
            console.error(chalk.red('\nConfigurationError:\n') + chalk.yellow('You must specify the "awsObj" element in the config, and it must contains this properties: ') + chalk.white('secretName, profile, region\nPassed:' + JSON.stringify(awsObj)))
            throw new Error('You must specify the "awsObj" element in the config, and it must contain this properties:\n secretName, profile, region')
        }
        await loadAwsSecrets(config, awsObj)
    }
    return config;
};

async function getSecretsFromAws(awsObj) {
    const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
    const { fromSSO } = require("@aws-sdk/credential-providers");
    let count = 0
    let maxTries = 10
    let response;
    let client
    while (++count <= maxTries) {
        try {
            if (!client) {
                client = new SecretsManagerClient({
                    region: awsObj.region,
                    credentials: fromSSO({ profile: awsObj.profile })
                });
            }
            response = await client.send(
                new GetSecretValueCommand({
                    SecretId: awsObj.secretName,
                    VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
                })
            );
            break
        } catch (error) {
            if (count == 1 && /Profile .*? was not found/gm.test(error.message) && awsObj.profile !== 'default') {
                console.log(error.message + '\nCredential Error: retring with default profile')
                awsObj.profile = 'default';
                client = undefined
            } else if (count == 2 && /Profile .*? was not found/gm.test(error.message)) {
                console.log(error.message + '\nCredential Error: retring with unsetted profile')
                client = new SecretsManagerClient({
                    region: awsObj.region,
                })
            } else {
                throw error;
            }
        }
    }
    const secret = JSON.parse(response.SecretString)
    return secret;
}

async function loadAwsSecrets(config, awsObj) {

    console.log(separator)
    console.log('Extracting secret from: "' + chalk.cyan('AWS Secrets Manger"\n'))
    const secret = await getSecretsFromAws(awsObj)
    config.env = {
        ...config.env,
        ...secret,
    }
    Object.keys(secret).forEach(key => {
        secret[key] = "".padStart(5, '*');
    });
    console.log(` - secret: "${JSON.stringify(secret, null, 4)}"`)
    console.log(chalk.green('\n√ ') + chalk.white('Secret loaded correctly from: "' + chalk.cyan(awsObj.secretName) + '"'))
}