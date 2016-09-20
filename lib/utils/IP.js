var OS = require('os');

module.exports = {
    getLocalIP: function () {
        //所有的网卡
        var ifaces = OS.networkInterfaces(),
            ip     = null;

        Object.keys(ifaces).forEach(function (ifname) {
            ifaces[ifname].forEach(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    return;
                }
                ip = iface.address;
            });
        });

        if (ip == null) {
            ip = '127.0.0.1';
        }

        return ip;
    }
};