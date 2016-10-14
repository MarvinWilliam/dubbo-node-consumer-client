var _ = require('underscore');
//-----------------------------------------------------------------------------------------------
// 随机算法
//-----------------------------------------------------------------------------------------------
function RandomLoadBalance() {
}

//-----------------------------------------------------------------------------------------------
RandomLoadBalance.prototype = {
    clear: function () {
    },

    getProviderWeight: function (provider) {
        return provider ? provider.weight : 0;
    },

    getProvider: function (invoker) {

        var providerList = invoker.getValidProviders(),
            count        = providerList.length, //总个数
            totalWeight  = 0,  //总权重
            i            = 0,
            sameWeight   = true; //权重是否一样

        for (i = 0; i < count; i++) {
            var weight = this.getProviderWeight(providerList[i]);
            totalWeight += weight; //累计总权重
            if (sameWeight && i > 0 && weight != this.getProviderWeight(providerList[i - 1])) { //计算所用权重是否一样
                sameWeight = false;
            }
        }

        if (totalWeight > 0 && !sameWeight) {
            // 如果权重不相同且权重大于0则按总权重随机
            var offset = Math.ceil(Math.random() * totalWeight);

            //并确定随机值落在哪个片段上
            for (i = 0; i < count; i++) {
                offset -= this.getProviderWeight(providerList[i]);
                if (offset <= 0) {
                    return providerList[i];
                }
            }
        }
        var r = Math.ceil(Math.random() * count) - 1;
        return providerList[r];
    }
};
//-----------------------------------------------------------------------------------------------
module.exports = RandomLoadBalance;