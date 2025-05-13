// config.js
let silentMode = false

function setSilentMode(mode) {
  silentMode = mode
}

function getSilentMode() {
  return silentMode
}

module.exports = { setSilentMode, getSilentMode }
