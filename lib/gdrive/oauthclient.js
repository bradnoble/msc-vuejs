//Modules
let fs = require('fs');
let readline = require('readline');
let googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/msc-googleapi.json
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
//const CREDENTIALS_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
const CREDENTIALS_DIR = __basedir + '/.credentials/';
const TOKEN_PATH = CREDENTIALS_DIR + 'msc-googleapi.json';
// console.log('base=' + __basedir);
// console.log(CREDENTIALS_DIR);
// console.log(TOKEN_PATH);ƒ

//OAuth client
let oauth2Client;

/*
* Initialize GoogleApi authentication client
*/
function init() {

    // Load client secrets from a local file.
    fs.readFile(CREDENTIALS_DIR + 'client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client w/ credentials
        authorize(JSON.parse(content));
    });

}

//console.log(process.env);

/*
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
    let clientSecret = credentials.installed.client_secret;
    let clientId = credentials.installed.client_id;
    let redirectUrl = credentials.installed.redirect_uris[0];
    let auth = new googleAuth();
    oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(storeToken);
        } else {
            oauth2Client.credentials = JSON.parse(token);
        }
    });
}

/*
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized client.
 */
function getNewToken(callback) {
    let authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);

    //Hard coded alternative since readline has problems
    code = '4/bcjkm0_yClTU8l29aoLs9tCN6aHrDLEjk9FhrHPTZ08';
    oauth2Client.getToken(code, function (err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
        }
        oauth2Client.credentials = token;
        //storeToken(token);
        callback(token);
    });

    return;
    //Hard coded alternative since readline has problems

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            //callback(oauth2Client);
        });
    });
}

/*
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(CREDENTIALS_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/*
* Get current oauthclient instance
*/
function getOAuthClient() {
    return oauth2Client;
}

/*
* Exports
*/
module.exports = {
    getOAuthClient: getOAuthClient,
    init: init
};