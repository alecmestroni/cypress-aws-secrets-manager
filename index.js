const { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } = require("@aws-sdk/client-secrets-manager")
const { fromSSO } = require("@aws-sdk/credential-providers")
const converter = require('number-to-words')
const chalk = require("chalk")
const path = require('path')

const separator = chalk.grey('\n====================================================================================================\n')
const strategyTypes = ['profile', 'default', 'unset', 'credentials', 'multi']
let errorAlreadyThrew = false

const getSecretFromAWS = async (env, directory) => {
    console.log(separator)
    console.log('Starting plugin: ' + chalk.green('cypress-aws-secrets-manager\n'))
    if (env.awsSecretsManagerConfig) {
        const awsSecretsManagerConfig = env.awsSecretsManagerConfig
        const mandatoryKeys = ['secretName', 'region']

        checkOnMandatoryKeys(awsSecretsManagerConfig, mandatoryKeys)

        const newEnv = await loadAwsSecrets(env, awsSecretsManagerConfig, directory)
        return newEnv
    } else {
        console.log(chalk.green('√ ') + chalk.white('Missing object:awsSecretsManagerConfig in env variables, continue without secrets!'))
        return env
    }
}

function checkOnMandatoryKeys(objectToControl, mandatoryKeys) {
    const missingProperties = mandatoryKeys.filter(property => !objectToControl[property])

    if (missingProperties.length > 0) {
        console.log(chalk.red('ConfigurationError!\n') + chalk.yellow('The object MUST contain these mandatory properties: ') + chalk.white(mandatoryKeys))
        console.log(chalk.green('\nPassed: ') + JSON.stringify(objectToControl, null, 1))
        console.log(chalk.red('\nMissing: ') + JSON.stringify(missingProperties, null, 1))
        throwException('The object MUST contain these mandatory properties: ' + mandatoryKeys)
    }
}

async function loadAwsSecrets(env, awsSecretsManagerConfig, directory) {
    const strategy = env.AWS_SSO_STRATEGY ?? 'multi'
    console.log('AWS SSO strategy: ' + chalk.cyan(JSON.stringify(strategy)))
    let secret
    if (strategy == 'multi') {
        secret = await tryMultiStrategy(awsSecretsManagerConfig, directory)
    } else {
        secret = await getSecretsFromAws(awsSecretsManagerConfig, strategy, directory)
    }
    const newEnv = {
        ...env,
        ...secret,
    }
    Object.keys(secret).forEach(key => {
        secret[key] = "".padStart(5, '*')
    })
    console.log(chalk.yellow("secret: ") + `${JSON.stringify(secret, null, 1)}"`)
    console.log(chalk.green('\n√ ') + chalk.white('Secret loaded correctly from: ') + chalk.cyan('"' + awsSecretsManagerConfig.secretName + '"'))
    return newEnv
}

async function tryMultiStrategy(awsSecretsManagerConfig, directory) {
    let counter = 0;
    let success = false;
    let response;

    while (counter < strategyTypes.length - 1 && !success) {
        try {
            counter++;
            const client = await createClient(awsSecretsManagerConfig, strategyTypes[counter - 1], counter, directory, false);
            response = await fetchSecret(client, awsSecretsManagerConfig.secretName);

            if (response) success = true;
        } catch (error) {
            console.log(chalk.red(converter.toOrdinal(counter) + ' attempt FAILED whit ERROR: ') + chalk.white(error.message));
            if (counter === strategyTypes.length - 1) {
                throwException('All login attempts have been exhausted. Unable to log in using any supported credential strategy.');
            }
        }
    }

    return parseSecret(response);
}

async function getSecretsFromAws(awsSecretsManagerConfig, strategy, directory) {
    try {
        const client = await createClient(awsSecretsManagerConfig, strategy, 1, directory);
        const response = await fetchSecret(client, awsSecretsManagerConfig.secretName);
        return parseSecret(response);
    } catch (error) {
        if (!errorAlreadyThrew) throwException(error);
        throwException('Error while setting credentials. Please check the console logs for more information.', false, false);
    }
}

async function fetchSecret(client, secretName) {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secretName,
            VersionStage: "AWSCURRENT",
        })
    );

    console.log(chalk.green('\n√ ') + 'AWS SDK credentials are set up correctly!\n');
    console.log('Extracting secret from: ' + chalk.cyan('"AWS Secrets Manager"\n'));

    return response;
}

function parseSecret(response) {
    if (!response?.SecretString) {
        throw new Error('Invalid response from AWS Secrets Manager');
    }
    return JSON.parse(response.SecretString);
}

async function createClient(awsSecretsManagerConfig, strategy, counter, directory, throwError) {
    switch (strategy) {
        case 'profile':
            return setClientWithSSO(awsSecretsManagerConfig, counter, throwError)
        case 'default':
            awsSecretsManagerConfig.profile = 'default'
            return setClientWithSSO(awsSecretsManagerConfig, counter, throwError)
        case 'unset':
            return setClientWithoutCredentials(awsSecretsManagerConfig, counter)
        case 'credentials':
            return setClientWithCredentials(awsSecretsManagerConfig, directory, counter, throwError)
        default:
            throw new Error('Strategy type: ' + chalk.cyan(strategy) + ' not supported')
    }
}

function setClientWithSSO(awsSecretsManagerConfig, counter = 1, throwError = true) {
    console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying to retrieve secrets using profile: ' + chalk.cyan(JSON.stringify(awsSecretsManagerConfig.profile)))
    if (awsSecretsManagerConfig.profile) {
        return new SecretsManagerClient({
            region: awsSecretsManagerConfig.region,
            credentials: fromSSO({ profile: awsSecretsManagerConfig.profile }),
        })
    } else {
        if (throwError) {
            throwException('Missing \'profile\' key in awsSecretsManagerConfig')
            errorAlreadyThrew = true
        }
    }
}

function setClientWithoutCredentials(awsSecretsManagerConfig, counter = 1) {
    console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying to retrieve secrets using AWS credentials from environment variables')
    return new SecretsManagerClient({
        region: awsSecretsManagerConfig.region,
    })
}

function setClientWithCredentials(awsSecretsManagerConfig, directory, counter = 1, throwError = true) {
    console.log('\n' + converter.toOrdinal(counter) + ' attempt: Trying to retrieve secrets using AWS credentials passed by user')
    if (awsSecretsManagerConfig.pathToCredentials) {
        const credentialsFilename = path.join(directory, awsSecretsManagerConfig.pathToCredentials)
        const credentials = require(credentialsFilename)
        const hiddenCredentials = {}
        const mandatoryCredentials = ["accessKeyId", "secretAccessKey", "sessionToken"]
        checkOnMandatoryKeys(credentials, mandatoryCredentials)
        Object.keys(credentials).forEach(key => {
            hiddenCredentials[key] = "".padStart(5, '*')
        })
        console.log('\n' + chalk.cyan('\nCredentials imported correctly: ') + chalk.white(JSON.stringify(hiddenCredentials, null, 1)))
        return new SecretsManagerClient({
            region: awsSecretsManagerConfig.region,
            credentials: credentials
        })
    } else {
        throwException('Missing \'pathToCredentials\' key in awsSecretsManagerConfig', throwError)
        errorAlreadyThrew = true
    }
}

const throwException = (errorMessage, logInTerminal = true, throwError = true) => {
    errorAlreadyThrew = true
    if (errorMessage == 'ExpiredTokenException: The security token included in the request is expired') {
        errorMessage += ' or maybe the environment not configured correctly to use the \'unset\' strategy'
    }
    if (logInTerminal) {
        console.log(chalk.red('\nIncorrect plugin configuration!'))
        console.log(chalk.red('ERROR: ') + errorMessage)
        console.log(separator)
    }
    if (throwError) throw Error(errorMessage)
}

async function updateSecret(env, secretValue, directory) {
    const awsSecretsManagerConfig = env.awsSecretsManagerConfig
    const secretName = awsSecretsManagerConfig.secretName
    try {
        if (typeof secretValue !== 'object') {
            throw new Error('secretValue deve essere un oggetto')
        }

        const strategy = env.AWS_SSO_STRATEGY ?? 'multi'
        const existingSecrets = await getSecretsFromAws(awsSecretsManagerConfig, strategy)

        const updatedSecrets = { ...existingSecrets, ...secretValue }

        const putCommand = new PutSecretValueCommand({
            SecretId: secretName,
            SecretString: JSON.stringify(updatedSecrets),
        })

        const client = await createClient(awsSecretsManagerConfig, strategy, directory)
        const putResponse = await client.send(putCommand)
        console.log(chalk.green('\n√ ') + 'Secret updated successfully: ' + chalk.cyan(secretName))
        return putResponse
    } catch (error) {
        console.error(chalk.red('Error updating secret: '), error)
        throw error
    }
}

module.exports = {
    getSecretFromAWS,
    updateSecret
};
