var Cluster    = require('./cluster/index'),
    HttpClient = require('../utils/Http'),
    Utils      = require('../utils/Common');

//-----------------------------------------------------------------------------------------------
var toUrl      = function (provider, serviceName) {
        return 'http://' + provider + '/' + serviceName
    },
    toPostData = function (methodName, methodArgs) {
        return {
            "jsonrpc": "2.0",
            "method": methodName,
            "params": methodArgs,
            "id": Utils.randomId()
        };
    };

//-----------------------------------------------------------------------------------------------
module.exports = {
    execService: function (invokerDesc, serviceName) {
        return function (methodName, methodParams) {
            var methodArgs = toPostData(methodName, [].concat(methodParams));
            return Cluster
                .getProvider(invokerDesc)
                .then(function (providerIp) {
                    var url = toUrl(providerIp, serviceName);
                    return HttpClient.post(url, methodArgs)
                });
        }
    }
};