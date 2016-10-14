var Zookeeper = require('node-zookeeper-client'),
    Config    = require('../config/index'),
    Utils     = require('../utils/Common'),
    Invoker   = require('../rpc/invoker/index'),
    Cluster   = require('../rpc/cluster/index'),
    RPCClient = require('../rpc/index'),
    Log       = require('../log/index');
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
            Log.info('Registry : 已连接上zookeeper');
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
        services = [].concat(services);
        services.forEach(function (item) {
            var invoker = new Invoker(item.service, item.version, item.group);
            self.registryQueue.push(invoker.toString());
            self.register(invoker);
        });
    },
    register: function (invoker) {
        var self = this;
        self._getZookeeper()
            .then(function (client) {
                return self.subscribe(invoker, client);
            })
            .then(function (client) {
                return self.configurators(invoker, client);
            })
            .then(function (client) {
                //创建dubbo的consumer
                var registryPath       = Config.getRegistryPath(invoker.serviceName, invoker.group),
                    registryPathFolder = Config.getRegistryPathFolder(invoker.serviceName),
                    invokerDesc        = invoker.toString();

                function _registry() {
                    //检查消费者目录是否存在
                    //不存在则优先创建目录,然后再创建消费者节点
                    client.exists(registryPathFolder, function (error, stat) {
                        if (error) {
                            Log.error('RegistryPathFolder error.' + registryPathFolder);
                            process.exit(1);
                            return;
                        }

                        if (stat) {
                            //存在
                            client.create(registryPath, null, Zookeeper.CreateMode.EPHEMERAL, function (err) {
                                if (err) {
                                    Log.error('Registry : 注册失败 [' + invokerDesc + '] [' + err.toString() + ']');
                                } else {
                                    Log.info('Registry : 注册成功 [' + invokerDesc + ']');
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
                        } else {
                            //不存在
                            //创建文件夹
                            client.create(registryPathFolder, null, Zookeeper.CreateMode.PERSISTENT, function (err) {
                                if (err) {
                                    Log.error('RegistryPathFolder create error.' + registryPathFolder);
                                } else {
                                    //创建完成则重新调用该方法
                                    _registry();
                                }
                            });
                        }
                    });
                }

                _registry();
            });
    },
    //订阅服务信息
    subscribe: function (invoker, client) {
        var self        = this,
            invokerDesc = invoker.toString(),
            path        = Config.getSubscribePath(invoker.serviceName);

        function childrenHandler(err, children) {
            if (err) {
                Log.error('Registry : 订阅失败 [' + invokerDesc + '] [' + err.toString() + ']');
            } else {
                Log.info('Registry : 订阅成功 [' + invokerDesc + ']');
                self.onMethodChangeHandler(invoker, children, 'subscribe');
            }
        }

        function getChildrenList(client) {
            //获取订订阅服务的providers
            client.getChildren(path, function () {
                getChildrenList(client);
            }, childrenHandler);
        }

        return new Promise(function (resolve) {
            client.getChildren(path, function () {
                getChildrenList(client);
            }, function (err, children) {
                childrenHandler(err, children);
                resolve(client);
            });
        });
    },
    //dubbo动态配置信息
    configurators: function (invoker, client) {
        var self        = this,
            serviceName = invoker.serviceName,
            path        = Config.getConfiguratorsPath(serviceName);

        function childrenHandler(err, children) {
            if (err) {
                Log.error('Registry : 获取权重失败 [' + serviceName + '] [' + err.toString() + ']');
            } else if (children.length > 0) {
                Log.info('Registry : 获取动态配置信息 [' + serviceName + '] ');
                self.onMethodChangeHandler(invoker, children, 'configurators');
            } else {
                Log.info('Registry : 获取权重失败 [' + serviceName + '] [Configurator protocol empty.Resume all providers.]');
                invoker.resumeProviders();
            }
        }

        function getChildrenList(client) {
            client.getChildren(path, function () {
                getChildrenList(client);
            }, childrenHandler);
        }

        return new Promise(function (resolve) {
            client.getChildren(path, function () {
                getChildrenList(client);
            }, function (err, children) {
                childrenHandler(err, children);
                resolve(client);
            });
        });
    },
    //方法修改之后刷新Cluster
    onMethodChangeHandler: function (invoker, children, type) {
        //开始执行前先锁定方法
        Cluster.lock();

        //如果是订阅的消息,down掉所有的节点
        //下面的操作将会重新启用的节点
        if(type === 'subscribe'){
            invoker.downProviders();
        }

        //动态配置会将当前禁用的节点重新进行推送
        //重置所有禁用的状态
        if (type === 'configurators') {
            invoker.resumeProviders();
        }

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
                    invoker.configProvider(oHost[1],
                        mWeight ? ~~mWeight[1] : Config.getDefaultWeight(),
                        (mEnable && mEnable[1] == 'true') && (mDisabled && mDisabled[1] == 'false'));
                    Log.info('Registry : 动态配置刷新 [' + invoker.toString() + '] INFO [' + child + ']');
                }
            } else {
                if (jHost && mMehtod && invoker.isMatch(mGroup && mGroup[1], mVersion && mVersion[1])) {
                    Log.info('Registry : 提供者 [' + invoker.toString() + '] HOST [' + jHost[1] + ']');

                    invoker.addProvider(jHost[1], mWeight ? ~~mWeight[1] : Config.getDefaultWeight());
                    //如果存在方法列表,则添加方法invoker
                    if (mMehtod[1]) {
                        invoker.setMethods(mMehtod[1].split(','));
                    }
                }
            }
        }.bind(this));

        //配置信息重写完成,刷新provider
        Cluster.refreshProvider(invoker);
        //执行完成之后解锁方法
        Cluster.unlock();
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
        Log.info('zookeeper disposed');
    }
};

//-----------------------------------------------------------------------------------------------
var registry = new Registry();
module.exports = registry;

//-----------------------------------------------------------------------------------------------
// 进程事件出发时,关闭zookeeper连接
//-----------------------------------------------------------------------------------------------
process.on('SIGINT', function () {
    registry.destroy();
});
process.on('exit', function () {
    registry.destroy();
});
