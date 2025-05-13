// logger.js
const { getSilentMode } = require('./config')
const chalk = require('chalk')

function log(...args) {
  // sempre visibile, bypassa silentMode
  console.log(...args)
}

function info(...args) {
  // anche in silentMode vogliamo vedere warning
  if (!getSilentMode()) {
    console.log(...args)
  }
}

function warn(...args) {
  // anche in silentMode vogliamo vedere warning
  console.warn(chalk.yellow(...args))
}

function error(...args) {
  // anche in silentMode vogliamo vedere gli errori
  console.error(chalk.red(...args))
}

module.exports = { log, info, warn, error }
