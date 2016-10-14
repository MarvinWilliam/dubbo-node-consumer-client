//-----------------------------------------------------------------------------------------------
// 轮询算法
//-----------------------------------------------------------------------------------------------
function RoundLoadBalance() {
    this.serviceCount = {};
}

//-----------------------------------------------------------------------------------------------
RoundLoadBalance.prototype = {
    //清空invoker的计数器
    clear: function (invokerDesc) {
        if (this.serviceCount[invokerDesc]) {
            delete this.serviceCount[invokerDesc];
        }
    },
    getProvider: function (invoker) {
        var providerList = invoker.getValidProviders();

        if (providerList.length === 0) {
            return undefined;
        }

        var invokerDesc = invoker.toString(),
            //调用次数
            callCount   = 0;

        //如果当前provider不在计数器中,则重新开始计数
        if (!this.serviceCount[invokerDesc]) {
            this.serviceCount[invokerDesc] = 0;
        } else {
            callCount = this.serviceCount[invokerDesc];
        }

        //拿下一个provider
        var index = callCount++ % providerList.length;

        //重新设置调用次数
        this.serviceCount[invokerDesc] = callCount;

        return providerList[index].provider;
    }
};

//-----------------------------------------------------------------------------------------------
module.exports = RoundLoadBalance;