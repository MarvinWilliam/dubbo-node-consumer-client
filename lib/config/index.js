var QS = require('querystring'),
    _  = require('underscore'),
    IP = require('../utils/IP');

function Config() {
    this.option = null;
    this.init();
}

Config.prototype = {
    init: function () {
        this.ip = IP.getLocalIP();
    },
    //读取配置文件
    load: function (options) {
        this.option = options;
        this.portfilter = (options.portfilter || []).map(function (item) {
            return item + '';
        });
        this.option.dubbo = this.option.dubbo || {
                providerTimeout: 3,
                weight: 1
            };
    },
    //获取默认权重
    getDefaultWeight: function () {
        return this.option.dubbo.weight || 100;
    },
    //获取注册中心的地址和配置
    getRegistryAddress: function () {
        return this.option.registry;
    },
    getRegistryPathFolder: function (serviceName) {
        return '/dubbo/' + serviceName + '/consumers';
    },
    getRegistryPath: function (serviceName, group) {
        this.option.application.interface = serviceName;
        var params = QS.stringify(_.extend({group: group}, this.option.application));
        return '/dubbo/' + serviceName + '/consumers/' + encodeURIComponent('consumer://' + this.ip + '/' + serviceName + '?') + params;
    },
    getSubscribePath: function (serviceName) {
        return '/dubbo/' + serviceName + '/providers';
    },
    getConfiguratorsPath: function (serviceName) {
        return '/dubbo/' + serviceName + '/configurators';
    },
    getRegistryOption: function () {
        return {
            sessionTimeout: this.option.registryTimeout || 30 * 1000, //超时
            spinDelay: this.option.registryDelay || 1000, //延迟
            retries: this.option.registryRetry || 0 //重试次数
        };
    },
    getLoadBalance: function () {
        return this.option.loadbalance || 'round';
    },
    getPortFilter: function () {
        return this.portfilter;
    },
    //获取Provider超时时间
    getProviderTimeout: function () {
        return this.option.dubbo.providerTimeout || 45;
    }
};

module.exports = new Config();