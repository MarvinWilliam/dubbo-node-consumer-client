var _      = require('underscore'),
    Utils  = require('../../utils/Common'),
    Config = require('../../config/index');

function Invoker(serviceName, version, group) {
    this.serviceName = serviceName;
    this.version = version;
    this.group = group;
    this.providers = [];
}

Invoker.prototype = {
    setProviders: function (provider, weight, enable) {
        var existIndex = _.findIndex(this.providers, {provider: provider});
        //存在相同节点
        if (existIndex !== -1) {
            //禁用状态  移除该节点
            if (!enable) {
                Utils.arrayRemove(this.providers, existIndex);
            } else {
                this.providers[existIndex].weight = weight;
            }
        } else {
            this.providers.push({
                provider: provider,
                weight: weight || Config.getDefaultWeight(),
                enable: enable === undefined ? true : enable
            });
        }
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