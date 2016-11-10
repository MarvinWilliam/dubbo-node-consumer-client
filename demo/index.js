var dubboClient = require('../index');

dubboClient.init({
    application: {
        'application': 'test',
        'application.version': '1.0',
        'category': 'consumers',
        'dubbo': 'dubbo_node_client_1.0',
        'side': 'consumer',
        'pid': process.pid,
        'version': '1.0.0'
    },
    dubbo: {
        providerTimeout: 10
    },
    registry: '192.168.0.100:2181',
    loadbalance: 'random'
});

dubboClient.registry([
    {
        "service": "com.test.service.UserService",
        "version": "1.0.0",
        "group": "test"
    },
    {
        "service": "com.test.service.RoleService",
        "version": "1.0.0",
        "group": "test"
    }
]);

dubboClient.getService('com.test.service.UserService', '1.0.0', 'test')
           .then(function (func) {
               return func('userInfo', ['1']);
           })
           .then(function (data) {
               console.log(data)
           })
           .catch(function (err) {
               console.error(err);
           });