var Config   = require('./lib/config/index'),
    Registry = require('./lib/registery/index');

module.exports = {
    init: function (options) {
        Config.load(options);
        Registry.init();
    },
    registry: function (services) {
        Registry.registeryServices(services);
    },
    getService: function (serviceName, version, group) {
        return Registry.execService(serviceName, version, group);
    }
};