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
    getProvider: function (invoker) {
        if (invoker.providers.length === 0) {
            return undefined;
        }

        var providerList = _.extend([], invoker.providers),
            //总权重
            allWeight    = 0,
            index,
            randomWeight,
            provider;

        for (index = 0; index < providerList.length; index++) {
            provider = providerList[index];
            provider['minWeight'] = allWeight;
            allWeight += provider.weight;
            provider['maxWeight'] = allWeight;
        }

        //取随机区间
        randomWeight = Math.floor(allWeight * Math.random());

        for (index = 0; index < providerList.length; index++) {
            provider = providerList[index];
            if (randomWeight >= provider.minWeight && randomWeight < provider.maxWeight) {
                return provider;
            }
        }
    }
};
//-----------------------------------------------------------------------------------------------
module.exports = RandomLoadBalance;