var Config   = require('./lib/config/index'),
    Registry = require('./lib/registery/index'),
    Log      = require('./lib/log/index');

module.exports = {
    init: function (options, logger) {
        Config.load(options);
        //初始化呢日志记录器,由外部传入log4js对象
        Log.init(logger);
        Registry.init();
    },
    registry: function (services) {
        Registry.registeryServices(services);
    },
    getService: function (serviceName, version, group) {
        return Registry.execService(serviceName, version, group);
    }
};