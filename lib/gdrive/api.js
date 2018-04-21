//Modules
let fs = require('fs');
let google = require('googleapis');
let oauthclient;
let gdrive;
let streams = require('memory-streams');

const rootId = '1FYTXZrrxnnRZeQEVfLHS5dx7sNYrASId';
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const queryExcludeTrash = ' and trashed=false';

function init() {
    gdrive = google.drive('v3');
}

/*
* Get folders/files in the root MSC drive
*/
function getRoot(callback) {

    gdrive.files.list({
        auth: oauthclient,
        fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
        pageSize: 25,
        q: "'" + rootId + "' in parents and mimeType='" + mimeTypeFolder + "'" + queryExcludeTrash,
        spaces: 'drive'
    }, function (err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }

        if (res.files.length == 0) {
            console.log('Root folders not found.');
        } else {
            console.log(res.files.length + ' folders in Root');
        }
        callback(res.files);
    });
}

/*
* Get list of files in a specific folder
*/
function listFilesByFolder(id, callback) {

    gdrive.files.list({
        auth: oauthclient,
        fields: "nextPageToken, files(id, name,size, mimeType, modifiedTime, hasThumbnail,thumbnailLink)",
        pageSize: 25,
        q: "'" + (id === '-1' ? rootId : id) + "' in parents" + queryExcludeTrash,  //"'1FYTXZrrxnnRZeQEVfLHS5dx7sNYrASId' in parents", //"mimeType='application/vnd.google-apps.folder' and name='public'", //"name contains '2017'",
        spaces: 'drive'
    }, function (err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            callback([]);
        }

        if (res.files.length == 0) {
            console.log('No files found.');
            callback([]);
        } else {
            console.log(res.files.length + ' Files found');
            callback(res.files);
        };
    });
}

/*
* Get metadata for a specific file
*/
function getFileMetaData(id, callback) {

    gdrive.files.get({
        auth: oauthclient,
        fileId: id
    }, function (err, metadata) {
        callback(metadata);
    });
}

/*
* Search for files based upon search criteria
*/
function findFiles(searchText, callback) {

    gdrive.files.list({
        auth: oauthclient,
        fields: "nextPageToken, files(id, name,size, mimeType, modifiedTime, hasThumbnail,thumbnailLink)",
        pageSize: 25,
        q: "'" + (id === '-1' ? rootId : id) + "' in parents" + queryExcludeTrash,  //"'1FYTXZrrxnnRZeQEVfLHS5dx7sNYrASId' in parents", //"mimeType='application/vnd.google-apps.folder' and name='public'", //"name contains '2017'",
        spaces: 'drive'
    }, function (err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            callback([]);
        }

        if (res.files.length == 0) {
            console.log('No files found.');
            callback([]);
        } else {
            console.log(res.files.length + ' Files found');
            callback(res.files);
        };
    });
}

/*
* Get a Base64 encoded file
*/
function getFileBase64(id, res, callback) {

    //Array of response data (PDF)
    var resData = [];

    gdrive.files.get({
        auth: oauthclient,
        fileId: id,
        alt: 'media'
    })
        .on('data', function (chunk) {
            //Add chunks of PDF file to array
            resData.push(chunk);
        })
        .on('end', function () {
            //Concatenate PDF data chunks into single buffer
            var buffer = Buffer.concat(resData);
            //Send back base-64 encoded
            res.write(buffer.toString('base64'));
            console.log('Base64 file downloaded');
            callback();
        })
        .on('error', function (err) {
            console.log('Error during Base64 download', err);
        });

}

/*
* Get a file
*/
function getFile(id, res, callback) {

    //Array of response data
    var resData = [];

    gdrive.files.get({
        auth: oauthclient,
        fileId: id,
        alt: 'media'
    })
        .on('error', function (err) {
            console.log('Error during download', err);
        }).pipe(res);

}

/*
* Set OAuth client for accessing MSC Google Drive
*/
function setOAuthClient(client) {
    oauthclient = client;
}

/*
* Get folder mimeType
*/
function getFolderMimeType() {
    return mimeTypeFolder;
}

/*
*Get root ID for MSC Google Drive
*/
function getRootId() {
    return rootId;
}

/*
* Exports
*/
module.exports = {
    getFile: getFile,
    getFileBase64: getFileBase64,
    getFileMetaData: getFileMetaData,
    listFilesByFolder: listFilesByFolder,
    getFolderMimeType: getFolderMimeType,
    getRoot: getRoot,
    getRootId: getRootId,
    init: init,
    setOAuthClient: setOAuthClient
};