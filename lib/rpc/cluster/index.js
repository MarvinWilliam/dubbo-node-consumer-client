var _                  = require('underscore'),
    Config             = require('../../config/index'),
    loadBalance_random = require('./loadbalance/random'),
    loadBalance_round  = require('./loadbalance/round');

function Cluster() {
    //invoker集合
    this.invokers = {};
    //读取锁,当刷新服务的时候,拒绝所有的服务获取
    this._lock = false;
    //方法队列,当读取锁处于锁定状态,所有的请求放到队列中
    this.funcQueue = [];
}

Cluster.prototype = {
    init: function () {
        //初始化provider算法
        this.loadBalance = Config.getLoadBalance() === 'round' ? new loadBalance_round() : new loadBalance_random();
    },
    refreshProvider: function (invoker) {
        var invokerDesc = invoker.toString();
        //清空原来的invoker信息
        this.loadBalance.clear(invokerDesc);
        //覆盖原有的invoker
        this.invokers[invokerDesc] = _.extend({}, invoker);
    },
    lock: function () {
        this._lock = true;
    },
    unlock: function () {
        this._lock = false;
        //循环,将阻塞的方法顺序执行
        while (this.funcQueue.length > 0) {
            this.funcQueue.shift().call(this, this.invokers);
        }
    },
    _getAllProvider: function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self._lock) {
                self.funcQueue.push(resolve);
            } else {
                resolve(self.invokers);
            }
        });
    },
    getProvider: function (invokerDesc) {
        var self = this;
        return self._getAllProvider()
                   .then(function (invokers) {
                       var invoker = invokers[invokerDesc];
                       if (!invoker) {
                           return Promise.reject(new Error('Can not get provider. ----Cluster----' + invokerDesc));
                       } else {
                           var provider = self.loadBalance.getProvider(invoker);
                           if (provider) {
                               return provider.provider;
                           } else {
                               return Promise.reject(new Error('Invoker provider is null. ----Cluster----' + invokerDesc));
                           }
                       }
                   });
    }
};

module.exports = new Cluster();