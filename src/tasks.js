const chalk = require("chalk");
const {
    updateSecret,
} = require('./utils');

module.exports = (on, config) => {
    // Expose plugin tasks
    on('task', {
        updateSecret(secretValue) {
            return updateSecret(config.env, secretValue);
        }
    });
}

