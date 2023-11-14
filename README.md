# Load AWS Secrets into Cypress as env-variable

Integrate the power of AWS Secrets Manager seamlessly into your Cypress tests with the cypress-aws-secrets-manager plugin. This lightweight yet powerful plugin facilitates the secure loading of secrets stored in AWS Secrets Manager directly into your Cypress environment variables, ensuring a streamlined and secure approach to managing sensitive information in your test scripts.

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

## Install

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

### Code in cypress.config.js:

In your cypress.config.js file:

```javascript
module.exports = defineConfig({
	e2e: {
		async setupNodeEvents(on, config) {
			const getSecretFromAWS = require('cypress-aws-secrets-manager')
			await getSecretFromAWS(on, config)
		},
	},
})
```

### Define AWS login strategy

- **AWS_SSO_STRATEGY**: `'profile'|'default'|'unset'|'multi'`
  - If `profile` will use the profile name specified inside the awsSecretsManagerConfig (If the profile is not specified, the default profile will be used).
  - If `default` will use the default sso config.
  - If `unset` will login without sso authentication, used mostly when running cypress on CI tools, cause them are already authenticated.
  - If `multi` will try with every strategy, fails only after trying them all.

If not specified the 'multi' strategy will be used.

### Define awsSecretsManagerConfig object:

The awsSecretsManagerConfig is an object containing the following parameters:
| Parameter | Mandatory | Notes |
| ---------- | --------- | -------------------------- |
| secretName | TRUE | AWS secret name |
| profile | FALSE | AWS SSO profile name, if not set the plugin will use 'default' profile |
| region | TRUE | AWS Secrets Manager region |

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

Simply add **"AWS_SSO_STRATEGY"** inside the "env" object and add **awsSecretsManagerConfig** as follows:

```json
//environment.json
{
	"baseUrl": "https://www.google.com",
	"env": {
		"AWS_SSO_STRATEGY": "strategy_type",
		"var1": "value1",
		"var2": "value2",
		"var3": "value3"
	},
	"awsSecretsManagerConfig": {
		"secretName": "AWS_SECRET_NAME",
		"profile": "AWS_PROFILE_NAME",
		"region": "AWS_REGION"
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
			const option = {
				awsSecretsManagerConfig: {
					secretName: 'AWS_SECRET_NAME',
					profile: 'AWS_PROFILE_NAME',
					region: 'AWS_REGION',
				},
			}
			config = {
				...config,
				...option,
			}
			const getSecretFromAWS = require('cypress-aws-secrets-manager')
			await getSecretFromAWS(on, config)
		},
	},
	env: {
		AWS_SSO_STRATEGY: 'strategy_type',
	},
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
**NB Change AWS_PROFILE_NAME with your profile name**

```bash
#awslogin_script.sh

#!/bin/bash

# Check to see if we are already logged in
SSO_ACCOUNT=$(aws sts get-caller-identity --query "Account" --profile AWS_PROFILE_NAME)

# If response is the sso_account_id we are already logged in (it has length 14)
if [ ${#SSO_ACCOUNT} -eq 14 ];  then
echo "AWS SSO session still valid, no login needed" ;

# Else we login with "aws sso login --profile AWS_PROFILE_NAME"
else
echo "" ; echo "AWS SSO session expired, login needed" ; echo ""
aws sso login --profile AWS_PROFILE_NAME

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
