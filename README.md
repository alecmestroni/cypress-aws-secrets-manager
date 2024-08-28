# Handle AWS Secrets easily with Cypress

Integrate the power of AWS Secrets Manager seamlessly into your Cypress tests with the cypress-aws-secrets-manager plugin. This lightweight yet powerful plugin facilitates the secure loading of secrets stored in AWS Secrets Manager directly into your Cypress environment variables, ensuring a streamlined and secure approach to managing sensitive information in your test scripts.

Additionally, it provides the capability to update secrets directly from your tests, allowing for dynamic and flexible secret management.

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

- [Installation](#installation)

- [Prerequisites](#prerequisites)
- [Main Functions](#functions)
  - [getSecretFromAWS](#getsecretfromaws)
  - [updateSecret](#updatesecret)
- [Global Configuration](#configuration)
  - [Code in cypress.config.js](#code-in-cypressconfigjs)
  - [Define awsSecretsManagerConfig object](#define-awssecretsmanagerconfig-object)
  - [Pass your AWS configuration to cypress](#pass-your-aws-configuration-to-cypress)
- [Results](#results)
- [Little tip for you](#little-tip-for-you)
- [Main Changes From V1](#main-changes)
  - [Storing `awsSecretsManagerConfig`](#storing-awssecretsmanagerconfig)
  - [Library Import in `setupNodeEvents`](#library-import-in-setupnodeevents)
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

## Functions

### getSecretFromAWS

The `getSecretFromAWS` function allows you to update your environment variables by adding secrets stored in AWS Secrets Manager. This function merges existing environment variables with new secrets from AWS Secrets Manager.

#### getSecretFromAWS Usage

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config, __dirname) {
      const { getSecretFromAWS, updateSecret } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      return config
    }
  }
})
```

### updateSecret

The `updateSecret` function allows you to update secrets stored in AWS Secrets Manager. This function merges existing secrets with new values and updates the secret in AWS Secrets Manager.

#### updateSecret Usage

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config, __dirname) {
      const { getSecretFromAWS, updateSecret } = require('cypress-aws-secrets-manager')
      on('task', {
        updateSecret(secretValue) {
          return updateSecret(config.env, secretValue)
        }
      })
      return config
    }
  }
})

//spec.cy.js
describe('testSuite', () => {
  it('testCase 1.1', () => {
    const secretValue = { secretKey: 'secretString' }
    cy.task('updateSecret', secretValue).then((result) => {
      cy.log(JSON.stringify(result))
    })
  })
})
```

**secretValue**: An object containing the new secretString for the secretKey to update & to merge with the existing ones.

#### Returns

A promise that resolves with the AWS Secrets Manager response if the secret is updated successfully, or rejects with an error if the update fails

## Global Configuration

### Code in cypress.config.js

In your cypress.config.js file:

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config, __dirname) {
      const { getSecretFromAWS, updateSecret } = require('cypress-aws-secrets-manager')
      config.env = await getSecretFromAWS(config.env, __dirname)
      on('task', {
        updateSecret(secretValue) {
          return updateSecret(config.env, secretValue)
        }
      })
      return config
    }
  }
})
```

### Define awsSecretsManagerConfig object

The awsSecretsManagerConfig is an object containing the following parameters:

```json
{
  "awsSecretsManagerConfig": {
    "secretName": "AWS_SECRET_NAME",
    "profile": "AWS_PROFILE_NAME",
    "region": "AWS_REGION",
    "pathToCredentials": "PATH_TO_AWS_CREDENTIALS"
  }
}
```

| Parameter         | Mandatory | Notes                                                                               | Deafult                            |
| ----------------- | --------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| secretName        | TRUE      | AWS secret name                                                                     | \                                  |
| region            | TRUE      | AWS Secrets Manager region                                                          | \                                  |
| profile           | FALSE     | AWS SSO profile name                                                                | 'default' profile                  |
| pathToCredentials | FALSE     | path to credentials file, used with 'credentials' if u want to write them in a file | Same folder as "cypress.config.js" |

#### Define AWS login strategy

- **AWS_SSO_STRATEGY**: `'profile'|'default'|'credentials'|'unset'|'multi'`
  - If `profile` will use the profile name specified inside the awsSecretsManagerConfig (If the profile is not specified, the default profile will be used).
  - If `default` will use the default sso config.
  - If `credentials` will log with aws credentials, need **access_key**, **secret_key** and **session_token** specified in a pathToCredential variable.
  - If `unset` will log with aws credentials, need **access_key**, **secret_key** and **session_token** as environment variable.
  - If `multi` will try with every strategy, fails only after trying them all.

| AWS_SSO_STRATEGY | AWS Auth Type                                       |
| ---------------- | --------------------------------------------------- |
| profile          | AWS SSO                                             |
| default          | AWS SSO                                             |
| credentials      | AWS IAM                                             |
| unset            | AWS IAM                                             |
| multi            | If not specified the 'multi' strategy will be used. |

#### Credential File example:

This Credential File is used with the AWS IAM strategy. This file is optional and is one of the two configurations that can be used.

```json
//pathToCredentials.json
{
  "accessKeyId": "xxxxxx",
  "secretAccessKey": "xxxxxx",
  "sessionToken": "xxxxxx"
}
```

## Pass your AWS configuration to cypress

After defining your strategy and your awsSecretsManagerConfig.  
I propose two solutions for you to import this configuration into cypress, it's up to you to decide which one to choose

### "Easy" way with [cypress-env](https://www.npmjs.com/package/cypress-env) plugin:

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

Simply add **"AWS_SSO_STRATEGY"** and **awsSecretsManagerConfig** inside the "env" object as follows:

```json
//environment.json
{
  "baseUrl": "https://www.google.com",
  "env": {
    "AWS_SSO_STRATEGY": "strategy_type",
    "var1": "value1",
    "var2": "value2",
    "var3": "value3",
    "awsSecretsManagerConfig": {
      "secretName": "AWS_SECRET_NAME",
      "profile": "AWS_PROFILE_NAME",
      "region": "AWS_REGION",
      "pathToCredentials": "PATH_TO_AWS_CREDENTIALS"
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
    async setupNodeEvents(on, config, __dirname) {

      const { getSecretFromAWS, updateSecret } = require('cypress-aws-secrets-manager')
      .env = await getSecretFromAWS(config.env, __dirname)
      return config
    }
  },
  env: {
    AWS_SSO_STRATEGY: 'strategy_type'
    awsSecretsManagerConfig: {
          secretName: 'AWS_SECRET_NAME',
          profile: 'AWS_PROFILE_NAME',
          region: 'AWS_REGION',
          pathToCredentials: 'PATH_TO_AWS_CREDENTIALS.JSON'
    }
  }
})
```

## Overwrite AWS_SSO_STRATEGY property when running on a different machine or on CI

Sometimes you'll need to override the AWS_SSO_STRATEGY property that was provided inside cypress.config.env.  
To do so, you'll need to run cypress with the following command:

```shell
npx cypress run -e AWS_SSO_STRATEGY=$OVERWRITING_AWS_SSO_STRATEGY
```

Where **$OVERWRITING_AWS_SSO_STRATEGY** is the new strategy value.

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

√ Missing awsSecretsManagerConfig, continue without secrets!

====================================================================================================
```

### Wrong configuration

**Description**  
Properties: secretName & region are mandatory

```shell
====================================================================================================

Starting plugin: cypress-aws-secrets-manager

ConfigurationError!
"awsSecretsManagerConfig" object MUST contains these mandatory properties: secretName,region

Passed: {
 "profile": "AWS_PROFILE_NAME"
}
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

## Little tip for you

You can create a bash file that verifies if you are already logged into the AWS account:  
**NB Change AWS_PROFILE & AWS_USER with your data**

```bash
#awslogin_script.sh
#!/bin/bash
AWS_PROFILE='your_profile'
AWS_USER="your_aws_user_number"

# Check to see if we are already logged in
ACCOUNT_ID_TEMP=$(aws sts get-caller-identity --query "Account" --profile $AWS_PROFILE | tr -d '"')

# If response is "533223568588" we are already logged in
if [ "$ACCOUNT_ID_TEMP" = "$AWS_USER" ]; then
    echo "AWS SSO session still valid, no login needed"

# Else we login with "aws sso login"
else
    echo ""
    echo "AWS SSO session expired, login needed"
    echo ""
    aws sso login --profile onboarding-noprod

fi
```

Then in your package.json file create a script like this:

```json
//package.json
{
  "scripts": {
    "cy:open": "sh awslogin_script.sh && npx cypress open",
    "cy:run": "sh awslogin_script.sh && npx cypress run"
  }
}
```

So you'll only have to type this command to open cypress and login into aws:

```bash
npm run cy:open
```

### Main Changes from V1

#### Storing `awsSecretsManagerConfig`

The `awsSecretsManagerConfig` should now be stored as a Cypress environment variable inside `config.env` and no longer directly in `config`.

#### Library Import in `setupNodeEvents`

The library should now be imported and used as follows:

```javascript
const { getSecretFromAWS, updateSecret } = require('cypress-aws-secrets-manager')
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
