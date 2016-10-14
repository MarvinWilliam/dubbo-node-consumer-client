var _      = require('underscore'),
    Config = require('../../config/index');

function Invoker(serviceName, version, group) {
    this.serviceName = serviceName;
    this.version = version;
    this.group = group;
    this.providers = [];
}

Invoker.prototype = {
    addProvider: function (provider, weight) {
        var exist = _.find(this.providers, {provider: provider});
        //不存在的时候才添加当前节点
        if (!exist) {
            this.providers.push({
                provider: provider,
                weight: weight || Config.getDefaultWeight(),
                enable: true,
                down: false
            });
        } else {
            exist.down = false;
        }
    },
    configProvider: function (provider, weight, enable) {
        var exist = _.find(this.providers, {provider: provider});
        if (exist) {
            //存在,修改配置信息
            exist.weight = weight;
            exist.enable = enable;
        } else {
            //不存在,将增加新的节点
            this.providers.push({
                provider: provider,
                weight: weight || Config.getDefaultWeight(),
                enable: enable,
                //不存在的配置信息里的节点,表示还没有启动
                down: true
            });
        }
    },
    downProviders: function () {
        this.providers.forEach(function (item) {
            item.down = true;
        });
    },
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
    },
    getValidProviders: function () {
        return this.providers.filter(function (item) {
            return item.enable && !item.down;
        });
    }
};

Invoker.getDesc = function (serviceName, version, group) {
    return serviceName + '_' + version + '_' + group;
};

module.exports = Invoker;