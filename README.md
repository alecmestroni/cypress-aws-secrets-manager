# Handle AWS Secrets easily with Cypress

Managing secrets securely and efficiently is crucial for any application. This plugin integrates AWS Secrets Manager into your Cypress tests, ensuring that sensitive data like API keys, passwords, and tokens remain secure during testing. It allows for secure loading and updating of secrets directly from your tests.

<h3 align="center">
  <a href="https://www.npmjs.com/package/cypress-aws-secrets-manager">
    <img src="https://img.shields.io/npm/v/cypress-aws-secrets-manager" align="center" />
  </a>
  <a href="https://www.npmjs.com/package/cypress-aws-secrets-manager">
    <img src="https://img.shields.io/npm/dm/cypress-aws-secrets-manager"  align="center" />
  </a>
  <a href="https://paypal.me/AlecMestroni?country.x=IT&locale.x=it_IT">
    <img src="https://raw.githubusercontent.com/alecmestroni/cypress-xray-junit-reporter/main/img/badge.svg" align="center" />
  </a>
</h3>

## Table of Contents

- [Main Changes From V1](#main-changes)
  - [Library Import in `setupNodeEvents`](#library-import-in-setupnodeevents)
  - [Storing `AWS_SECRET_MANAGER_CONFIG`](#storing-AWS_SECRET_MANAGER_CONFIG)
- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Global Configuration](#configuration)
  - [Code in cypress.config.js](#code-in-cypressconfigjs)
- [Main Functions](#functions)
  - [getSecretFromAWS](#getsecretfromaws)
  - [updateSecret](#updatesecret)
- [Environment variables](#environment-variables)
  - [Define AWS_SECRET_MANAGER_CONFIG object](#define-AWS_SECRET_MANAGER_CONFIG-object)
  - [AWS Login Strategies](#aws-login-strategies)
- [Pass your AWS configuration to cypress](#pass-your-aws-configuration-to-cypress)
- [Running on CI](#running-on-ci)
  - [Overwriting variables](#overriding-environment-variables-in-ci-or-local-setup)
  - [Importing Secrets from local file](#importing-secrets-from-a-local-file)
- [Results](#results)
- [Best Practices for AWS Login](#best-practices-for-aws-login)
  - [AWS SSO](#aws-sso-single-sign-on)
  - [AWS IAM](#aws-iam-assume-role)
- [THE JOB IS DONE](#the-job-is-done)

## Upgrading to Version 2

This is version 2 of the library, which includes significant performance improvements and several changes. Please update your configuration according to the new instructions provided below to avoid any issues. See [Main Changes](#main-changes-from-v1) for more details.

## Installation

```shell
$ npm install cypress-aws-secrets-manager --save-dev
```

or as a global module

```shell
$ npm install -g cypress-aws-secrets-manager
```

## Prerequisites

- AWS CLI [Install/Update](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- A user to SSO via [AWS Identity and Access Management](https://docs.aws.amazon.com/iam/).

## Configuration

### Code in cypress.config.js

In your cypress.config.js file:

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      const { getSecretFromAWS } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      require('cypress-aws-secrets-manager/tasks')(on, config)
      return config
    }
  }
})
```

## Functions

### getSecretFromAWS

```javascript
getSecretFromAWS(config.env, __dirname)
```

The `getSecretFromAWS` function allows you to update your environment variables by adding secrets stored in AWS Secrets Manager. This function merges existing environment variables with new secrets from AWS Secrets Manager.

#### getSecretFromAWS Usage

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      const { getSecretFromAWS } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      return config
    }
  }
})
```

### updateSecret

```javascript
cy.task('updateSecret', secretValue)
```

The `updateSecret` tasks allows you to update secrets stored in AWS Secrets Manager. This function merges existing secrets with new values and updates the secret in AWS Secrets Manager. See results here

**Features**

- **Adding Secrets**: Introduce a new key-value pair (e.g., [here](#adding-secrets-example))
- **Updating Secrets**: Change the value of an existing key (e.g., [here](#updating-secrets-example)).

**secretValue**
Must be an object containing the new secretString for the secretKey to update & to merge with the existing ones.

**Returns**:
A promise that resolves with the AWS Secrets Manager response if the secret is updated successfully, or rejects with an error if the update fails

#### updateSecret Usage

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      require('cypress-aws-secrets-manager/tasks')(on, config)
      return config
    }
  }
})

//spec.cy.js inside an it(..)
const secretValue = { secretKey: 'secretString' }
cy.task('updateSecret', secretValue).then((result) => {
  cy.log(JSON.stringify(result))
})
```

## Environment Variables

Environment variables should be easily modifiable from the command line (see [here](#overwrite-environment-variables-when-running-on-a-different-machine-or-on-ci)), whereas the other configurations should not.

| Parameter | Mandatory | Notes | Default |
| - | | - | - |
| AWS_SSO_STRATEGY | TRUE | A string that defines the AWS login strategy (see [here](#aws-login-strategies) for more details) | \ |
| AWS_SECRET_MANAGER_CONFIG | TRUE | An object that contains the essential configuration parameters (see [here](#define-aws_secret_manager_config-object) for more details) | \ |
| AWS_SECRETS_LOCAL_DIR | FALSE | Directory path where secrets should be saved locally . If not specified, secrets will not be saved (see [here](#importing-secrets-from-a-local-file) for more details) | \ |

### Define AWS_SECRET_MANAGER_CONFIG object

The main object required by this library is AWS_SECRET_MANAGER_CONFIG, which contains the following parameters:

```json
{
  "AWS_SECRET_MANAGER_CONFIG": {
    "secretName": "AWS_SECRET_NAME",
    "profile": "AWS_PROFILE_NAME",
    "region": "AWS_REGION",
    "pathToCredentials": "PATH_TO_AWS_CREDENTIALS.JSON"
  }
}
```

| Parameter | Mandatory | Notes | Default |
| -- | | -- | - |
| secretName | TRUE | AWS secret name | \ |
| region | TRUE | AWS Secrets Manager region | \ |
| profile | FALSE | AWS SSO profile name | 'default' profile |
| pathToCredentials | FALSE | path to credentials file, used with '[credentials](#credential-file-example)' if u want to write them in a file | Same folder as "cypress.config.js" |
| |

### AWS login strategies

The next configurations configurations are external to the `AWS_SECRET_MANAGER_CONFIG` because they can vary for the same project when executed locally and on CI. The variables within `AWS_SECRET_MANAGER_CONFIG` are more dependent on the execution environment.

- If `profile` will use the profile name specified inside the AWS_SECRET_MANAGER_CONFIG (If the profile is not specified, the default profile will be used).
- **AWS_SSO_STRATEGY**: `'profile'|'default'|'credentials'|'unset'|'multi'`
  - If `default` will use the default sso config.
  - If `credentials` will log with aws credentials, need **access_key**, **secret_key** and **session_token** specified in a pathToCredential variable.
  - If `unset` will log with aws credentials, need **access_key**, **secret_key** and **session_token** as environment variable.
  - If `multi` will try with every strategy, fails only after trying them all.

| AWS_SSO_STRATEGY | AWS Auth Type |
| - | |
| profile | AWS SSO |
| default | AWS SSO |
| credentials | AWS IAM |
| unset | AWS IAM |
| multi | If not specified the 'multi' strategy will be used. |

#### Credential File example:

This credential file is used with the AWS IAM strategy. It is optional.

```json
//pathToCredentials.json
{
  "accessKeyId": "xxxxxx",
  "secretAccessKey": "xxxxxx",
  "sessionToken": "xxxxxx"
}
```

## Pass your AWS configuration to cypress

After defining your strategy and your AWS_SECRET_MANAGER_CONFIG.

I propose two solutions for you to import this configuration into cypress, it's up to you to decide which one to choose

### "Easy" way with [cypress-env](https://www.npmjs.com/package/cypress-env) plugin:

**IMPORTANT NOTE: Import cypress-env before cypress-aws-secrets-manager**

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      require('cypress-env')(on, config)
      const { getSecretFromAWS } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      require('cypress-aws-secrets-manager/tasks')(on, config)
      return config
    }
  }
})
```

**PRO**: Zero code solution  
**CONS**: [cypress-env](https://www.npmjs.com/package/cypress-env) needed

Following the plugin's guide, you should end up with a JSON file, which must respect this syntax:

```json
//environment.json
{
  "baseUrl": "https://www.google.com",
  "env": {
    "var1": "value1",
    "var2": "value2",
    "var3": "value3"
  }
}
```

Simply add **"AWS_SSO_STRATEGY"** and **AWS_SECRET_MANAGER_CONFIG** inside the "env" object as follows:

```json
//environment.json
{
  "baseUrl": "https://www.google.com",
  "env": {
    "var1": "value1",
    "var2": "value2",
    "var3": "value3",
    "AWS_SSO_STRATEGY": "strategy_type",
    "AWS_SECRET_MANAGER_CONFIG": {
      "secretName": "AWS_SECRET_NAME",
      "profile": "AWS_PROFILE_NAME",
      "region": "AWS_REGION",
      "pathToCredentials": "PATH_TO_AWS_CREDENTIALS.JSON"
    }
  }
}
```

**No other changes needed**

### "Complex" way inside cypress.config.js:

**PRO**: No cypress-env needed  
**CONS**: Solution with some code

```javascript
//cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      const { getSecretFromAWS } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      return config
    }
  },
  env: {
    AWS_SSO_STRATEGY: 'strategy_type',
    AWS_SECRET_MANAGER_CONFIG: {
      secretName: 'AWS_SECRET_NAME',
      profile: 'AWS_PROFILE_NAME',
      region: 'AWS_REGION',
      pathToCredentials: 'PATH_TO_AWS_CREDENTIALS.JSON'
    }
  }
})
```

## Running on CI

### Overriding Environment Variables in CI or Local Setup

In certain cases, you may need to override specific environment variables like `AWS_SSO_STRATEGY` or `AWS_SECRETS_LOCAL_DIR` that are pre-configured in your `cypress.config.env`. This is particularly useful when running tests in different environments (e.g., local development vs CI) where different AWS configurations are required.

To override these variables when running Cypress, use the following command:

```shell
npx cypress run -e AWS_SSO_STRATEGY=$NEW_AWS_SSO_STRATEGY,AWS_SECRETS_LOCAL_DIR=$CUSTOM_SECRETS_DIR
```

- **$NEW_AWS_SSO_STRATEGY**: The new value for the AWS SSO strategy that overrides the default strategy configured in your project.
- **$CUSTOM_SECRETS_DIR**: The directory where you want to store or retrieve AWS secrets locally for reuse across multiple test sessions.

This allows for flexible configuration across different environments, ensuring that secrets and authentication strategies are handled correctly depending on where the tests are executed (e.g., in a CI pipeline or on a developer's machine).

### Importing Secrets from a Local File

I understand that allowing users to load secrets from a local file might seem counterintuitive. However, this approach becomes necessary especially when using a cloud provider like AWS, in scenarios involving assume-role chains that are limited to an hour in duration.

When conducting sequential tests, particularly with tools like Cypress that restart and reload environment variables for each new session, obtaining AWS secrets after the initial hour can be cumbersome. This can interrupt testing workflows, especially when secrets are needed across multiple sessions.
To mitigate this issue, I’ve added the option for users to specify a **AWS_SECRETS_LOCAL_DIR** variable.

If **AWS_SECRETS_LOCAL_DIR** is specified and the temporary file doesn't exist, the plugin will retrieve the secrets during the first session and store them locally. These stored secrets will then be reused in subsequent sessions, eliminating the need to continuously fetch them from AWS after the role chain expires.Every secrets will be saved in a JSON file named by the secret name.

This solution simplifies running multiple test sequences without worrying about refreshing the role or secret access within the limited session time frame.

See [here](#overwrite-environment-variables-when-running-on-a-different-machine-or-on-ci) to understand how to use different behavior on CI.

```json
//environment.json
{
  "baseUrl": "https://www.google.com",
  "env": {
    "AWS_SSO_STRATEGY": "strategy_type",
    "AWS_SECRETS_LOCAL_DIR": "aws_secrets_folder",
    "AWS_SECRET_MANAGER_CONFIG": {
      "secretName": "AWS_SECRET_NAME",
      "profile": "AWS_PROFILE_NAME",
      "region": "AWS_REGION",
      "pathToCredentials": "PATH_TO_AWS_CREDENTIALS.JSON"
    }
  }
}
```

## Results

### Correct configuration

```shell
====================================================================================================

Starting plugin: cypress-aws-secrets-manager

AWS SSO strategy: profile

1st attempt: Trying to login into AWS with profile: "AWS_PROFILE_NAME"

AWS SDK credentials are set up correctly!

Extracting secret from: "AWS Secrets Manger"

secret: "{
    "username": "*****",
    "password": "*****"
}"

√ Secret loaded correctly from: "AWS_SECRET_NAME"

====================================================================================================
```

### Missing configuration

**Description**  
Cypress has starter without plugin configurations

```shell
====================================================================================================

Starting plugin: cypress-aws-secrets-manager
√ Missing AWS_SECRET_MANAGER_CONFIG, continue without secrets!


====================================================================================================
```

### Wrong configuration

**Description**  
Properties: secretName & region are mandatory

```shell
====================================================================================================

Starting plugin: cypress-aws-secrets-manager

"AWS_SECRET_MANAGER_CONFIG" object MUST contains these mandatory properties: secretName,region
ConfigurationError!

Passed: [
 "profile": "AWS_PROFILE_NAME"
]
Missing: [
 "secretName",
 "region"
]

====================================================================================================
```

### Wrong credentials

**Description**  
Your credentials are invalid

```shell
====================================================================================================

Starting plugin: cypress-aws-secrets-manager

AWS SSO strategy: "multi"

1st attempt: Trying to login into AWS with profile: "AWS_PROFILE_NAME"

2nd attempt: Trying to login into AWS with profile: "default"

3rd attempt: Trying without specifying credentials

Incorrect plugin configuration!
ERROR: Could not load credentials from any providers

====================================================================================================
```

### Adding Secrets Example

**Initial Secret on AWS**:

```json
{
  "dbUsername": "admin",
  "apiKey": "someAPIKey"
}
```

**Cypress Test**:

```javascript
// spec.cy.js
describe('Adding Secrets', () => {
  it('should add a new dbPassword', () => {
    cy.task('updateSecret', { dbPassword: 'oldSecurePassword456!' })
  })
})
```

**Resulting Secret**:

```json
{
  "dbUsername": "admin",
  "dbPassword": "oldSecurePassword456!",
  "apiKey": "someAPIKey"
}
```

---

### Updating Secrets Example

**Current Secret on AWS**:

```json
{
  "dbUsername": "admin",
  "dbPassword": "oldSecurePassword456!",
  "apiKey": "someAPIKey"
}
```

**Cypress Test**:

```javascript
// spec.cy.js
describe('Updating Secrets', () => {
  it('should update the dbPassword', () => {
    cy.task('updateSecret', { dbPassword: 'newSecurePassword456!' })
  })
})
```

**Resulting Secret**:

```json
{
  "dbUsername": "admin",
  "dbPassword": "newSecurePassword456!",
  "apiKey": "someAPIKey"
}
```

Certainly! Here’s an expanded version of your context that provides more details and clarifies the best practices for logging into AWS using SSO or assume role, along with instructions on setting up the scripts in your `package.json`.

---

## Best Practices for AWS Login

When working with AWS, particularly in environments like development and testing, it's essential to ensure that you have authenticated access to your AWS account. Below are some best practices for managing AWS logins effectively, using either AWS SSO or Assume Role methods.

**Note**: **Make sure to add your specific credentials and configuration inside `aws_authenticate.sh`.**

### AWS SSO (Single Sign-On)

If your organization uses AWS SSO, you can utilize the following scripts to handle authentication seamlessly:

- [**aws_authenticate.sh**](https://raw.githubusercontent.com/alecmestroni/cypress-aws-secrets-manager/main/sh/sso/aws_authenticate.sh)  
  This set the needed environment variables and starts the aws_sso.sh script

- [**aws_sso.sh**](https://raw.githubusercontent.com/alecmestroni/cypress-aws-secrets-manager/main/sh/sso/aws_sso.sh)  
  This script checks your AWS SSO authentication status and logs you in if you're not already.

### AWS IAM (Assume Role)

For users and applications that need to assume roles to access specific AWS resources, the following scripts can be beneficial:

- [**aws_authenticate.sh**](https://raw.githubusercontent.com/alecmestroni/cypress-aws-secrets-manager/main/sh/assume_role/aws_authenticate.sh)  
  This set the needed environment variables and starts the aws_sso.sh script

- [**aws_assume_role.sh**](https://raw.githubusercontent.com/alecmestroni/cypress-aws-secrets-manager/main/sh/assume_role/aws_assume_role.sh)  
  This version of the script is designed for verifying your role assumption and logging you in if you're not already.

### Integrating with `package.json`

To streamline your workflow, you can create scripts in your `package.json` file that automate the login and application startup processes. Here’s how to do it:

1. Open your `package.json` file.
2. Add the following scripts:

```json
// package.json
{
  "scripts": {
    "cy:open": "sh aws_authenticate $ENV \"npx cypress open\"",
    "cy:run": "sh aws_authenticate $ENV \"npx cypress run\""
  }
}
```

### Running Your Scripts

With the scripts in place, you can easily open Cypress and authenticate with AWS in one command. To do this, simply run:

```bash
npm run cy:open
```

### Main Changes from V1

#### Storing `AWS_SECRET_MANAGER_CONFIG`

The `AWS_SECRET_MANAGER_CONFIG` should now be stored as a Cypress environment variable inside `config.env` instead of directly in `config`. Additionally, its name has changed from `awsSecretManagerConfig` to `AWS_SECRET_MANAGER_CONFIG` (although `awsSecretManagerConfig` is still valid).

#### Library Import in `setupNodeEvents`

The library should now be imported and used as follows:

```javascript
const { getSecretFromAWS } = require('cypress-aws-secrets-manager')
config.env = await getSecretFromAWS(config.env, __dirname)
```

Old method:

```javascript
const getSecretFromAWS = require('cypress-aws-secrets-manager')
await getSecretFromAWS(on, config, __dirname)
```

## THE JOB IS DONE!

Happy testing to everyone!

ALEC-JS

<h3 align="center">
🙌 Donate to support my work & further development! 🙌
</h3>

<h3 align="center">
  <a href="https://paypal.me/AlecMestroni?country.x=IT&locale.x=it_IT">
    <img src="https://raw.githubusercontent.com/alecmestroni/cypress-xray-junit-reporter/main/img/badge.svg" width="111" align="center" />
  </a>
</h3>
