**注:该项目已经不再维护, 如果有需要可以尝试新的组件 [node-dubbo-client](https://github.com/MarvinWilliam/node-dubbo-client)** 

# dubbo-node-consumer-client

dubbo的node消费者端.暂时只提供注册消费者的功能.

## Install

```
npm install --save dubbo-node-consumer-client
```

## Usage

#### * 项目启动的时候先对dubbo进行配置.

```
var dubboClient  = require('dubbo-node-consumer-client');
dubboClient.init({
    application: {
        'application': '',      //node应用的名称
        'application.version': '',      //node应用的版本
        'category': 'consumers',        //指定类型为消费者
        'dubbo': '',        //注册在dubbo上显示的名称
        'side': 'consumer',     //消费者端
        'pid': process.pid,     //node进程id
        'version': ''       //dubbo版本
    },
    dubbo: {
        providerTimeout: 10     //jsonrpc超时时间,默认为45秒
    },
    registry: '192.168.0.102:2181',     //zookeeper注册地址
    loadbalance: 'random',       //接口调用算法,random-权重/round-轮调,默认round
    portfilter: []      //过滤端口
});
```

#### * 配置完成之后,对所有使用到的服务进行注册

**注意:如果注册的服务不存在于zookeeper上,会在zookeeper上创建服务文件夹,等待服务注册.**

```
var interfaces = [
    {
        "service": "",      //服务名称
        "version": "",      //服务版本
        "group": ""     //服务所属的分组
    },{
        "service": "",
        "version": "",
        "group": ""
    }
];
dubboClient.registry(interfaces);
```

#### * 以上配置完成即可调用服务

```
/**
 *  这里的data是数组类型,严格按照服务提供者的参数接收顺序.
 *
 *  如果提供者的方法是形参接收,数组内的数据顺序就是形参的顺序.
 *  例:  服务提供者方法     test(int a,int b);
 *       data拼接方式[a,b]
 *  如果服务提供者的方法是对象接收,数组直接放入对象.
 *  例:  服务提供者方法     test(User user)
 *       data拼接方式[{user object}]
 **/
var data = [];

dubboClient.getService(serviceName, version, group)
           .then(function(_promise){
                //methodName --- 服务中具体的某个方法
                return _promise(methodName,data);
           })
           .then(function(result){
                //这里的result即为服务返回的数据
           })
           .catch(function(err){
                //捕获服务调用中的异常
           });
```

## API

**init(options[,logger])**

options.application
---当前应用的dubbo描述信息

options.registry
---zookeeper注册地址

options.loadbalance
---服务调用算法,random-权重/round-轮调,默认round

options.portfilter
---过滤指定的端口

logger
---日志记录器,可选
---提供外部日志记录,目前只支持log4js,外部注册完成的logger对象即可logger.getLogger('dubbo')
---默认使用console输出日志

**registry(interfaces)**

interfaces
---服务描述信息

interface.service
---服务在dobbo上注册的名称

interface.version
---服务的版本

interface.group
---服务的分组

**getService(serviceName, version, group)**

这里的三个参数和registry方法中三个描述信息相同

