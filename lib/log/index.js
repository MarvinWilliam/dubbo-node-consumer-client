function logInfo() {
    this.log = console;
    this._initFunction();
}

logInfo.prototype = {
    init: function (logger) {
        if (logger) {
            this.log = logger;
        }
    },
    _getLoger: function () {
        return this.log;
    },
    _initFunction: function () {
        var funcName = ['trace', 'info', 'warn', 'error'],
            self     = this;
        funcName.forEach(function (name) {
            self[name] = function (str) {
                self._getLoger()[name](str);
            }
        });
    }
};

module.exports = new logInfo();