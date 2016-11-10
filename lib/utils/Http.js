var Request = require('request');

module.exports = {
    post: function (url, data, timeout) {
        return new Promise(function (resolve, reject) {
            Request({
                url: url,
                method: 'post',
                body: JSON.stringify(data),
                headers: {
                    "Content-type": "application/json-rpc",
                    "Accept": "text/json"
                },
                timeout: timeout
            }, function (err, response, body) {
                if (err) {
                    reject(err);
                } else {
                    try {
                        body = JSON.parse(body);
                        if (body.error) {
                            reject(body.error);
                        } else {
                            resolve(body.result);
                        }
                    } catch (e) {
                        reject(new Error('Server response error.' + body));
                    }
                }
            });
        });
    }
};
