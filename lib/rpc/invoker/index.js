var _      = require('underscore'),
    Config = require('../../config/index');

function Invoker(serviceName, version, group) {
    this.serviceName = serviceName;
    this.version = version;
    this.group = group;
    this.providers = [];
}

Invoker.prototype = {
    setProviders: function (provider, weight) {
        this.providers.push({
            provider: provider,
            weight: weight || Config.getDefaultWeight(),
            enable: true
        });
    },
    //刷新节点,提供给动态配置使用
    //注意:之刷新存在的节点,不存在的节点可能是其他服务使用的协议类型
    refreshProviders: function (provider, weight, enable) {
        var exist = _.find(this.providers, {provider: provider});
        //存在相同节点
        if (exist) {
            exist.weight = weight;
            exist.enable = enable;
        }
    },
    //恢复所有的provider
    resumeProviders: function () {
        this.providers.forEach(function (item) {
            item.enable = true;
        });
    },
    setMethods: function (methods) {
        this.methods = methods;
    },
    isMatch: function (group, version) {
        return this.group === group && this.version === version;
    },
    toString: function () {
        return this.serviceName + '_' + this.version + '_' + this.group;
    }
};

Invoker.getDesc = function (serviceName, version, group) {
    return serviceName + '_' + version + '_' + group;
};

module.exports = Invoker;