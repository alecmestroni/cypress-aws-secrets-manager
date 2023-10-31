# Cypress-Env | A Cypress plugin to handle multi environment

[![npm version](https://badge.fury.io/js/cypress-env.svg)](https://badge.fury.io/js/cypress-env)

Cypress plugin to handle different environment easly

## Installation

```shell
$ npm install cypress-env --save-dev
```

or as a global module

```shell
$ npm install -g cypress-env
```

## Configuration

### Code in cypress.config.js:

In your cypress.config.js file:

```
module.exports = defineConfig({
 e2e: {
  setupNodeEvents(on, config) {
   require('cypress-xray-junit-reporter/plugin')(on, config, __dirname)
  },
 },
})
```

### Create the env.config folder:

Then configure a folder named `env.config' with your environments.json files:

```bash
├── cypress
│   ├── e2e
│   ├── fixtures
│   └── support
├── cypress.config.js
├── env.config
│   ├── test.json
│   ├── stage.json
│   └── prod.json
├── node_modules
├── README.md
├── package-lock.json
├── package.json
└── .gitignore
```

### Add your environment.json files:

JSON files must respect this sintax:

```json
//test.json
{
	"baseUrl": "https://www.google.com",
	"specPattern": "cypress/e2e/**/**.js",
	"excludeSpecPattern": "cypress/e2e/**/toExlude.js",
	"env": {
		"var1": "value1",
		"var2": "value2",
		"var3": "value3"
	}
}
```

| Parameter          | Mandatory | Overwrites value in cypress.config.js | Notes                                    |
| ------------------ | --------- | ------------------------------------- | ---------------------------------------- |
| baseUrl            | FALSE     | TRUE                                  | Overwrites value in cypress.config.js    |
| specPattern        | FALSE     | TRUE                                  | Overwrites value in cypress.config.js    |
| excludeSpecPattern | FALSE     | TRUE                                  | Overwrites value in cypress.config.js    |
| env                | FALSE     | FALSE                                 | OBJ added to values in cypress.config.js |

### Open or run cypress with the correct environment variables:

Open cypress and inject the envName variables:

```bash
npx cypress open -e envName=test
```

or run cypress and inject the envName variables:

```bash
npx cypress run -e envName=test
```

The log will be something like this:

```
====================================================================================================

Extracting local configurations from: "path/to/environment.json"

 - baseUrl: "https://www.google.com"
 - specPattern: "cypress/e2e/**/**.js"
 - excludeSpecPattern: "cypress/e2e/**/toExlude.js",
 - env: "{
    "var1": "value1",
    "var2": "value2",
    "var3": "value3",
    "envName": "test"
}"

√ Configurations loaded correctly for the environment: < TEST >
```

### Little tip for you

In your package.json file add a script like this:

```json
//package.json
{
	"scripts": {
		"cy:test": "npx cypress open -e envName=test",
		"cy:stage": "npx cypress open -e envName=stage",
		"cy:prod": "npx cypress open -e envName=prod"
	}
}
```

So you'll only have to type this command to open cypress in the correct environment:

```bash
npm run cy:test
```

## THE JOB IS DONE!

Happy testing to everyone!

ALEC-JS
