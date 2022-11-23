const cachios = require('cachios');

const settings = require('../settings.json').jiraServerSettings;
const _authString = 'Basic ' + Buffer.from(settings.user + ':' + settings.password).toString('base64');
const _apiBaseUrl = settings.url + '/rest/api/2';

async function _getRequest(endpoint) {
    const request = {
        headers: {
            'Authorization': _authString
        },
        ttl: 300 // seconds
    };
    const url = encodeURI(_apiBaseUrl + endpoint);
    return cachios.get(url, request); 
}

module.exports = {
    getUserByUsername: async function(username) {
        if(!username) return null;
        if(!settings.url) throw 'A URL to connect with the Jira API has not been provided.';

        const response = await _getRequest('/user/search?includeInactive=true&username=' + username)
        .catch(error => {
            const response = error?.response;
            if(!response) {
                console.log(error);
                throw `Error ${error.code} executing request`;
            }
            switch(response.status) {
                case 404: return console.log(`Username ${username} was not found`);
                case 401: throw 'API authentication error. Please, review your credentials.';
                default: throw `Error status ${response.status} retrieving user ${username}`;
            }
        });

        const body = response && response.data;
        if(!body || !body.length) return;
        return body[0];
    }
}
