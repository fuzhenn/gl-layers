const configuration = require('./config.js');
configuration.files[1] = './dist/maptalksgl.js';
module.exports = function (config) {
    config.set(configuration);
};