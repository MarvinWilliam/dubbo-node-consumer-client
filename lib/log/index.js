var log4js = require('log4js'),
    mkdirp = require('mkdirp'),
    _      = require('underscore');

function logInfo() {
    this.log = console;
    this._initFunction();
}

logInfo.prototype = {
    init: function (options) {
        if (options.logDirectory) {
            this.log.error('Dubbo-node-client init logDirectory is empty.');
            return;
        }

        try {
            mkdirp.sync(options.logDirectory);
        } catch (e) {
            if (e.code != 'EEXIST') {
                this.log.log("Dubbo-node-client could not set up log directory, error was: " + e.message);
                return;
            }
        }

        this.config = options.config || {
                appenders: [
                    {
                        type: 'console',
                        level: 'ALL'
                    }
                ]
            };

        log4js.configure(this.config);
        this.log = log4js.getLogger('dubbo');
    },
    _initFunction: function () {
        var funcName = ['trace', 'info', 'warn', 'error'],
            self     = this;
        funcName.forEach(function (name) {
            self[name] = function () {
                self.log.call(this, _.toArray(arguments));
            }
        });
    }
};

module.exports = new logInfo();