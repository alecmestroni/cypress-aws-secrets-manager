const chalk = require("chalk");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { fromSSO } = require("@aws-sdk/credential-providers");
const separator = chalk.grey('\n====================================================================================================\n')
const converter = require('number-to-words');

let client;

module.exports = async (on, config) => {
    console.log(separator)
    const mandatoryProperties = ['secretName', 'region']
    let missingProperties = []
    console.log('Starting plugin: ' + chalk.green('cypress-aws-secret-manager\n'))
    if (config.awsSecretsManagerConfig) {
        const awsSecretsManagerConfig = config.awsSecretsManagerConfig
        if (!awsSecretsManagerConfig.secretName || !awsSecretsManagerConfig.region) {
            console.log(chalk.red('ConfigurationError!\n') + chalk.yellow('The "awsSecretsManagerConfig" object MUST contain these mandatory properties: secretName, region: ') + chalk.white(mandatoryProperties))
            console.log(chalk.green('\nPassed: ') + JSON.stringify(awsSecretsManagerConfig, null, 1))
            mandatoryProperties.forEach((property) => {
                Object.keys(awsSecretsManagerConfig).forEach(item => {
                    if (property !== item) {
                        missingProperties.push(property)
                    }
                })
            })
            console.log(chalk.red('Missing: ') + JSON.stringify(missingProperties, null, 1))
            console.log(separator)
            throw new Error('The "awsSecretsManagerConfig" object MUST contain these mandatory properties: secretName, region: ' + mandatoryProperties)
        }
        await loadAwsSecrets(config, awsSecretsManagerConfig)
    } else {
        console.log(chalk.green('√ ') + chalk.white('Missing awsSecretsManagerConfig, continue without secrets!'))
    }
    return config;
};

const throwException = (errorMessage) => {
    console.log(chalk.red('\nIncorrect plugin configuration!'));
    console.log(chalk.red('ERROR: ') + errorMessage);
    console.log(separator);
    throw new Error('Incorrect credentials configuration');
}
const handleProfileNotFound = (awsSecretsManagerConfig, errorMessage, strategy) => {
    if (/Profile .*? was not found/gm.test(errorMessage)) {
        if (strategy === 'multi' && awsSecretsManagerConfig.profile && awsSecretsManagerConfig.profile !== 'default') {
            awsSecretsManagerConfig.profile = 'default';
            client = undefined;
        } else if (strategy === 'multi' && awsSecretsManagerConfig.profile === 'default') {
            awsSecretsManagerConfig.profile = undefined;
            client = new SecretsManagerClient({
                region: awsSecretsManagerConfig.region,
            });
        } else {
            throwException(errorMessage)
        }
    } else {
        throwException(errorMessage)
    }
};

async function getSecretsFromAws(awsSecretsManagerConfig, strategy) {
    let count = 0;
    const strategyTypes = ['profile', 'default', 'unset', 'multi'];
    let response;

    while (++count <= strategyTypes.length) {
        if (!strategyTypes.includes(strategy)) {
            throwException('Strategy type not supported');
        }
        try {
            if (strategy === 'default') {
                awsSecretsManagerConfig.profile = 'default';
            }
            if (!client && awsSecretsManagerConfig.profile && strategy !== 'unset') {
                console.log('\n' + converter.toOrdinal(count) + ' attempt: Trying to login into AWS with profile: ' + chalk.cyan(JSON.stringify(awsSecretsManagerConfig.profile)));
                client = new SecretsManagerClient({
                    region: awsSecretsManagerConfig.region,
                    credentials: fromSSO({ profile: awsSecretsManagerConfig.profile }),
                });
            } else {
                console.log('\n' + converter.toOrdinal(count) + ' attempt: Trying without specifying credentials');
                client = new SecretsManagerClient({
                    region: awsSecretsManagerConfig.region,
                });
            }
            response = await client.send(
                new GetSecretValueCommand({
                    SecretId: awsSecretsManagerConfig.secretName,
                    VersionStage: "AWSCURRENT",
                })
            );

            console.log(chalk.green('\n√ ') + 'AWS SDK credentials are set up correctly!\n');
            console.log('Extracting secret from: ' + chalk.cyan('"AWS Secrets Manager"\n'));
            break;
        } catch (error) {
            handleProfileNotFound(awsSecretsManagerConfig, error.message, strategy);
        }
    }

    if (!response) {
        throwException('No response');
    }
    const secret = JSON.parse(response.SecretString);
    return secret;
}

async function loadAwsSecrets(config, awsSecretsManagerConfig) {
    const strategy = config.env.AWS_SSO_STRATEGY ?? 'multi'
    console.log('AWS SSO strategy: ' + chalk.cyan(JSON.stringify(strategy)))
    const secret = await getSecretsFromAws(awsSecretsManagerConfig, strategy)
    config.env = {
        ...config.env,
        ...secret,
    }
    Object.keys(secret).forEach(key => {
        secret[key] = "".padStart(5, '*');
    });
    console.log(chalk.yellow("secret: ") + `${JSON.stringify(secret, null, 1)}"`)
    console.log(chalk.green('\n√ ') + chalk.white('Secret loaded correctly from: ') + chalk.cyan('"' + awsSecretsManagerConfig.secretName + '"'))
}