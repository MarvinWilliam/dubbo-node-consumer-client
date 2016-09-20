var Config    = require('../config/index'),
    Utils     = require('../utils/Common'),
    Invoker   = require('../rpc/invoker/index'),
    Cluster   = require('../rpc/cluster/index'),
    RPCClient = require('../rpc/index'),
    Zookeeper = require('node-zookeeper-client');
//-----------------------------------------------------------------------------------------------
function Registry() {
    this.zookeeper = null;
    this.isInitializing = true;
    this.registring = true;
    this.initQueue = [];
    this.registryQueue = [];
    this.registryExecQueue = [];
}

Registry.prototype = {
    //初始化zookeepers
    init: function () {
        var self = this;
        Cluster.init();
        self.zookeeper = Zookeeper.createClient(Config.getRegistryAddress(), Config.getRegistryOption());
        self.zookeeper.once('connected', function () {
            while (self.initQueue.length > 0) {
                self.initQueue.shift().call(self, self.zookeeper);
            }
            self.isInitializing = false;
            console.log('Registry : 已连接上zookeeper');
        });
        self.zookeeper.connect();
    },
    _getZookeeper: function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.zookeeper) {
                resolve(self.zookeeper);
            } else if (self.isInitializing) {
                //如果zookeeper正在初始化中, 其他就不要初始化了, 加入队列等待
                self.initQueue.push(resolve);
            }
        });
    },
    //先注册所有的服务
    registeryServices: function (services) {
        var self = this;
        services.forEach(function (item) {
            var invoker = new Invoker(item.service, item.version, item.group);
            self.registryQueue.push(invoker.toString());
            self.register(invoker);
        });
    },
    register: function (invoker) {
        var self = this;
        self.subscribe(invoker)
            .then(function (client) {
                //创建dubbo的consumer
                var registryPath = Config.getRegistryPath(invoker.serviceName, invoker.group),
                    invokerDesc  = invoker.toString();
                client.create(registryPath, null, Zookeeper.CreateMode.EPHEMERAL, function (err) {
                    if (err) {
                        console.error('Registry : 注册失败 [' + invokerDesc + '] [' + err.toString() + ']');
                    } else {
                        console.log('Registry : 注册成功 [' + invokerDesc + ']', 'color:#bada55');
                    }
                });
            });
    },
    //订阅服务信息
    subscribe: function (invoker) {
        var self        = this,
            invokerDesc = invoker.toString(),
            path        = Config.getSubscribePath(invoker.serviceName);

        function getChildrenList(client) {
            //获取订订阅服务的providers
            client.getChildren(path, function () {
                getChildrenList(client);
            }, function (err, children) {
                if (err) {
                    console.error('Registry : 订阅失败 [' + invokerDesc + '] [' + err.toString() + ']');
                } else {
                    console.log('Registry : 获得订阅消息 [' + invokerDesc + ']');
                    self.onMethodChangeHandler(invoker, children);
                    console.log('Registry : 订阅成功 [' + invokerDesc + ']');
                }

                if (self.registring) {
                    Utils.arrayRemove(self.registryQueue, self.registryQueue.indexOf(invoker.toString()));
                    if (self.registryQueue.length === 0) {
                        while (self.registryExecQueue.length > 0) {
                            var exection = self.registryExecQueue.shift();
                            exection.func(exection.data);
                        }
                        self.registring = false;
                    }
                }
            });
        }

        return self._getZookeeper()
                   .then(function (client) {
                       getChildrenList(client);
                       return client;
                   })
                   .then(function (client) {
                       self.configurators(invokerDesc);
                       return client;
                   });
    },
    //方法修改之后刷新Cluster
    onMethodChangeHandler: function (invoker, children) {
        //开始执行前先锁定方法
        Cluster.lock();
        children.forEach(function (child) {
            child = decodeURIComponent(child);
            var jHost     = /^jsonrpc:\/\/([^\/]+)\//.exec(child),
                oHost     = /^override:\/\/([^\/]+)\//.exec(child),
                mVersion  = /version=(\d\.\d\.\d)/.exec(child),
                mGroup    = /group=([^&]+)/.exec(child),
                mMehtod   = /methods=([^&]+)/.exec(child),
                mWeight   = /weight=(\d+)/.exec(child),
                mDisabled = /disabled=([^&]+)/.exec(child),
                mEnable   = /enabled=([^&]+)/.exec(child);

            //disabled和enable是动态配置的两个选项
            if ((mDisabled !== null || mEnable !== null) && oHost !== null) {
                if (invoker.isMatch(mGroup && mGroup[1], mVersion && mVersion[1])) {
                    invoker.setProviders(oHost[1],
                        mWeight ? ~~mWeight[1] : Config.getDefaultWeight(),
                        (mEnable && mEnable[1] == 'true') || (mDisabled && mDisabled[1] == 'false'));
                }
            } else {
                if (jHost && mMehtod && invoker.isMatch(mGroup && mGroup[1], mVersion && mVersion[1])) {
                    console.info('Registry : 提供者 [' + invoker.toString() + '] HOST [' + jHost[1] + ']');
                    invoker.setProviders(jHost[1], mWeight ? ~~mWeight[1] : Config.getDefaultWeight());
                    //如果存在方法列表,则添加方法invoker
                    if (mMehtod[1]) {
                        invoker.setMethods(mMehtod[1].split(','));
                    }
                }
            }
        }.bind(this));

        if (children.length === 0) {
            invoker.providers = [];
        }

        Cluster.refreshProvider(invoker);
        //执行完成之后解锁方法
        Cluster.unlock();
    },
    //dubbo动态配置信息
    configurators: function (invoker) {
        var self        = this,
            serviceName = invoker.serviceName,
            path        = Config.getConfiguratorsPath(serviceName);

        function getChildrenList(client) {
            client.getChildren(path, function () {
                getChildrenList(client);
            }, function (err, children) {
                if (err) {
                    console.error('Registry : 获取权重失败 [' + serviceName + '] [' + err.toString() + ']');
                } else if (children.length > 0) {
                    console.log('Registry : 获取动态配置信息 [' + serviceName + '] ');
                    self.onMethodChangeHandler(invoker, children);
                    console.log('Registry : 获取权重成功 [' + serviceName + '] ');
                } else {
                    console.warn('Registry : 获取权重失败 [' + serviceName + '] [ 尚未发现服务提供者 ]');
                }
            });
        }

        self._getZookeeper()
            .then(function (client) {
                getChildrenList(client);
            });
    },
    execService: function (serviceName, version, group) {
        var self = this,
            func = RPCClient.execService(Invoker.getDesc(serviceName, version, group), serviceName);

        if (this.registring) {
            return new Promise(function (resolve) {
                self.registryExecQueue.push({
                    func: resolve,
                    data: func
                });
            });
        } else {
            return Promise.resolve(func);
        }

    },
    //关闭zookeeper链接
    destroy: function () {
        this.zookeeper ? this.zookeeper.close() : '';
    }
};

//-----------------------------------------------------------------------------------------------
var registry = new Registry();
module.exports = new Registry();

//-----------------------------------------------------------------------------------------------
// 监听进程,退出的时候关闭zookeeper连接
//-----------------------------------------------------------------------------------------------
process.on('SIGINT', registry.destroy);
process.on('exit', registry.destroy);
