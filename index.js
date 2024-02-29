const { SecretsManagerClient, GetSecretValueCommand, ListSecretsCommand } = require("@aws-sdk/client-secrets-manager");
const { fromSSO } = require("@aws-sdk/credential-providers");
const converter = require('number-to-words');
const chalk = require("chalk");
const path = require('path');
const fs = require('fs');

const separator = chalk.grey('\n====================================================================================================\n')
const strategyTypes = ['profile', 'default', 'unset', 'iam', 'multi'];
let errorAlreadyThrowed = false
let directory
let response
let client

module.exports = async (on, config, directoryTemp) => {
    directory = directoryTemp
    console.log(separator)
    console.log('Starting plugin: ' + chalk.green('cypress-aws-secrets-manager\n'))
    if (config.awsSecretsManagerConfig) {
        const awsSecretsManagerConfig = config.awsSecretsManagerConfig
        const mandatoryKeys = ['secretName', 'region']

        checkOnMandatoryKeys(awsSecretsManagerConfig, mandatoryKeys)

        await loadAwsSecrets(config, awsSecretsManagerConfig)
    } else {
        console.log(chalk.green('√ ') + chalk.white('Missing awsSecretsManagerConfig, continue without secrets!'))
    }
    return config;
};

function checkOnMandatoryKeys(objectToControl, mandatoryKeys) {
    let missingProperties = []

    mandatoryKeys.forEach(property => {
        if (!objectToControl[property]) {
            missingProperties.push(property);
        }
    });

    if (missingProperties.length > 0) {
        console.log(chalk.red('ConfigurationError!\n') + chalk.yellow('The object MUST contain these mandatory properties: ') + chalk.white(mandatoryKeys))
        console.log(chalk.green('\nPassed: ') + JSON.stringify(objectToControl, null, 1))
        console.log(chalk.red('\nMissing: ') + JSON.stringify(missingProperties, null, 1))
        throwException('The object MUST contain these mandatory properties: ' + mandatoryKeys)
    }
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

async function getSecretsFromAws(awsSecretsManagerConfig, strategy) {
    try {
        switch (strategy) {
            case 'profile':
                setCLientWithSSO(awsSecretsManagerConfig)
                break;
            case 'default':
                awsSecretsManagerConfig.profile = 'default';
                setCLientWithSSO(awsSecretsManagerConfig)
                break;
            case 'iam':
                setClientWithCredentials(awsSecretsManagerConfig)
                break;
            case 'unset':
                setClientWithoutCredentials(awsSecretsManagerConfig)
                break;
            case 'multi':
                return await tryMultiStrategy(awsSecretsManagerConfig, strategy)
            default:
                throwException('Strategy type: ' + chalk.cyan(strategy) + ' not supported');
                errorAlreadyThrowed = true
        }

        response = await client.send(
            new GetSecretValueCommand({
                SecretId: awsSecretsManagerConfig.secretName,
                VersionStage: "AWSCURRENT",
            })
        );

        console.log(chalk.green('\n√ ') + 'AWS SDK credentials are set up correctly!\n');
        console.log('Extracting secret from: ' + chalk.cyan('"AWS Secrets Manager"\n'));

    } catch (error) {
        if (!errorAlreadyThrowed) throwException(error)
    }

    if (errorAlreadyThrowed) {
        throwException('Error while setting credentials. Please check the console logs for more information.', false, false);
    }

    const secret = JSON.parse(response.SecretString);
    return secret;
}

function setClientWithCredentials(awsSecretsManagerConfig, counter = 1) {
    if (awsSecretsManagerConfig.pathToCredentials) {
        console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying to login into AWS with IAM configuration\n');
        const credentialsFilename = path.join(directory, awsSecretsManagerConfig.pathToCredentials)
        const credentials = require(credentialsFilename)
        const hiddenCredentials = {}
        const mandatoryCredentials = ["accessKeyId", "secretAccessKey", "sessionToken"]
        checkOnMandatoryKeys(credentials, mandatoryCredentials)
        Object.keys(credentials).forEach(key => {
            hiddenCredentials[key] = "".padStart(5, '*');
        });
        console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying to login into AWS with IAM credentials.\n' + chalk.cyan('\nCredentials imported correctly: ') + chalk.white(JSON.stringify(hiddenCredentials, null, 1)));
        client = new SecretsManagerClient({
            region: awsSecretsManagerConfig.region,
            credentials: credentials
        })
        // deleteFile(credentialsFilename)}
    } else {
        throwException('Missing \'pathToCredentials\' key in awsSecretsManagerConfig');
        errorAlreadyThrowed = true
    };
}

function deleteFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            console.error('Error while deleting the file', err);
            return;
        }
        console.log('File deleted successfully');
    });
}

function setClientWithoutCredentials(awsSecretsManagerConfig, counter = 1) {
    console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying without specifying credentials');
    client = new SecretsManagerClient({
        region: awsSecretsManagerConfig.region,
    });
}

function setCLientWithSSO(awsSecretsManagerConfig, counter = 1) {
    if (awsSecretsManagerConfig.profile) {
        console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying to login into AWS with profile: ' + chalk.cyan(JSON.stringify(awsSecretsManagerConfig.profile)));
        client = new SecretsManagerClient({
            region: awsSecretsManagerConfig.region,
            credentials: fromSSO({ profile: awsSecretsManagerConfig.profile }),
        });
    } else {
        throwException('Missing \'profile\' key in awsSecretsManagerConfig');
        errorAlreadyThrowed = true
    };
}

async function tryMultiStrategy(awsSecretsManagerConfig) {
    let counter = 0 // 'multi' strategy is not counted in this while
    let success = false
    let endedRetries = false
    while (counter < strategyTypes.length && !success) {
        try {
            client = undefined;
            counter++
            switch (counter) {
                case 1:
                    setCLientWithSSO(awsSecretsManagerConfig, counter)
                    break;
                case 2:
                    awsSecretsManagerConfig.profile = 'default';
                    setCLientWithSSO(awsSecretsManagerConfig, counter)
                    break;
                case 3:
                    setClientWithCredentials(awsSecretsManagerConfig, counter)
                    break;
                case 4:
                    setClientWithoutCredentials(awsSecretsManagerConfig, counter)
                    break;
                default:
                    endedRetries = true
                    throwException('All login attempts have been exhausted. Unable to log in using any supported credential strategy.');
            }
            response = await client.send(
                new GetSecretValueCommand({
                    SecretId: awsSecretsManagerConfig.secretName,
                    VersionStage: "AWSCURRENT",
                })
            );
            if (response) success = true

            console.log(chalk.green('\n√ ') + 'AWS SDK credentials are set up correctly!\n');
            console.log('Extracting secret from: ' + chalk.cyan('"AWS Secrets Manager"\n'));
        }
        catch (error) {
            if (endedRetries != true) throwException(error, true, false)
        }
    }

    const secret = JSON.parse(response.SecretString);
    return secret
}

const throwException = (errorMessage, logInTerminal = true, throwError = true) => {
    errorAlreadyThrowed = true
    if (errorMessage == 'ExpiredTokenException: The security token included in the request is expired') {
        errorMessage += ' or maybe the environment not configured correctly to use the \'unset\' strategy'
    }
    if (logInTerminal) {
        console.log(chalk.red('\nIncorrect plugin configuration!'));
        console.log(chalk.red('ERROR: ') + errorMessage);
        console.log(separator);
    }
    if (throwError) throw new Error(errorMessage);
}