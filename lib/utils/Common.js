module.exports = {
    randomId: function () {
        var d = new Date().getTime();
        return d + Math.floor(Math.random() * 1000000);
    },
    arrayRemove: function (array, index) {
        if (index <= -1) {
            return;
        }
        if (index < array.length) {
            for (var i = 0, n = 0; i < array.length; i++) {
                if (array[i] !== array[index]) {
                    array[n++] = array[i];
                }
            }
            array.length -= 1;
        }
    }
};