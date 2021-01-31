const fetch = require('node-fetch');
const settings = require('../settings.json').jiraServerSettings;

const _authString = 'Basic ' + Buffer.from(settings.user + ':' + settings.password).toString('base64');
const _apiBaseUrl = settings.url + '/rest/api/2';

async function _getRequest(endpoint) {
    const request = {
        method: 'GET',
        headers: {
            'Authorization': _authString
        }
    };
    const url = encodeURI(_apiBaseUrl + endpoint);
    return fetch(url, request); 
}

module.exports = {
    getUserByUsername: async function(username) {
        if(!username) return null;
        const response = await _getRequest('/user/search?includeInactive=true&username=' + username);
        if(response.status === 404) return null;
        if(response.status !== 200) throw 'Error retrieving user ' + username;

        const body = await response.json();
        return body.length ? body[0] : null;
    }
}
