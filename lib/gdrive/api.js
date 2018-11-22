//Modules
let fs = require('fs');
let gdrive;
let { google } = require('googleapis');
let oauthclient;
let streams = require('memory-streams');

const MIMETYPE_GOOGLE_DOCUMENT = 'application/vnd.google-apps.document';
const MIMETYPE_GOOGLE_SPREADSHEET = 'application/vnd.google-apps.spreadsheet';
const MIMETYPE_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';
const MIMETYPE_MSWORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIMETYPE_PDF = 'application/pdf';
const QUERY_EXCLUDETRASH = ' and trashed=false';
const ROOT_ID = '1FYTXZrrxnnRZeQEVfLHS5dx7sNYrASId';


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
        orderBy: "name",
        pageSize: 25,
        q: "'" + ROOT_ID + "' in parents and mimeType='" + MIMETYPE_FOLDER + "'" + QUERY_EXCLUDETRASH,
        spaces: 'drive'
    }, function (err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }

        if (res.data.files.length == 0) {
            console.log('Root folders not found.');
        } else {
            console.log(res.data.files.length + ' folders in Root');
        }
        addFileProperties(res.data.files);
        callback(res.data.files);
    });
}

/*
* Get list of files in a specific folder
*/
function listFilesByFolder(id, callback) {

    gdrive.files.list({
        auth: oauthclient,
        fields: "nextPageToken, files(id,name,size,mimeType,modifiedTime,hasThumbnail,thumbnailLink)",
        orderBy: "name",
        pageSize: 25,
        q: "'" + (id === '-1' ? ROOT_ID : id) + "' in parents" + QUERY_EXCLUDETRASH,  //"'1FYTXZrrxnnRZeQEVfLHS5dx7sNYrASId' in parents", //"mimeType='application/vnd.google-apps.folder' and name='public'", //"name contains '2017'",
        spaces: 'drive'
    }, function (err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            callback([]);
        }

        if (res.data.files.length == 0) {
            console.log('No files found.');
            callback([]);
        } else {
            console.log(res.data.files.length + ' Files found');
            addFileProperties(res.data.files);
            callback(res.data.files);
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
        orderBy: "name",
        pageSize: 25,
        q: "'" + (id === '-1' ? ROOT_ID : id) + "' in parents" + QUERY_EXCLUDETRASH,  //"'1FYTXZrrxnnRZeQEVfLHS5dx7sNYrASId' in parents", //"mimeType='application/vnd.google-apps.folder' and name='public'", //"name contains '2017'",
        spaces: 'drive'
    }, function (err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            callback([]);
        }

        if (res.data.files.length == 0) {
            console.log('No files found.');
            callback([]);
        } else {
            console.log(res.data.files.length + ' Files found');
            addFileProperties(res.data.files);
            callback(res.data.files);
        };
    });
}

/*
* Add properties to files
*/
function addFileProperties(files) {
    files.forEach(file => {
        switch (file.mimeType) {
            case 'application/vnd.google-apps.folder':
                file.type = 'Folder';
                file.canDownload = false;
                file.canView = false;
                break;
            case 'application/pdf':
                file.type = 'PDF';
                file.canDownload = true;
                file.canView = true;
                break;
            case 'application/vnd.google-apps.document':
                file.type = 'Word';
                file.canDownload = true;
                file.canView = false;
                break;
            case 'application/vnd.google-apps.spreadsheet':
                file.type = 'Spreadsheet';
                file.canDownload = true;
                file.canView = false;
                break;
            default:
                file.type = '-';
                file.canDownload = false;
                file.canView = false;
        }

        //Format file size to KB etc.
        if (file.hasOwnProperty('size')) {
            file.sizeFormatted = formatBytes(file.size, 2);
        } else {
            file.sizeFormatted = '&minus;';
        }

        file.modifiedTimeFormatted = file.modifiedTime.substr(0, 10) + ' ' + file.modifiedTime.substr(11, 5);
    });
}

/*
 * Format bytes to KB, MB, etc. 
 */
function formatBytes(bytes, decimals) {
    if (bytes == 0) return '0 Bytes';
    let k = 1024,
        dm = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/*
* Get Base64 encoded file content
*/
function getFileBase64(id, res, callback) {

    //Array of response data (PDF)
    var resData = [];

    gdrive.files.get({
        auth: oauthclient,
        fileId: id,
        alt: 'media'
    }, function (err, gres) {
        if (err) {
            console.log('Error during Base64 download', err);
        }

        if (gres.data) {

            // resData.push(res.data);

            //Concatenate PDF data chunks into single buffer
            var buffer = Buffer.from(gres.data);
            //Send back base-64 encoded
            res.write(buffer.toString('base64'));
            console.log('Base64 file downloaded');
            callback();
        }
    });

    // gdrive.files.get({
    //     auth: oauthclient,
    //     fileId: id,
    //     alt: 'media'
    // })
    //     .on('data', function (chunk) {
    //         //Add chunks of PDF file to array
    //         resData.push(chunk);
    //     })
    //     .on('end', function () {
    //         //Concatenate PDF data chunks into single buffer
    //         var buffer = Buffer.concat(resData);
    //         //Send back base-64 encoded
    //         res.write(buffer.toString('base64'));
    //         console.log('Base64 file downloaded');
    //         callback();
    //     })
    //     .on('error', function (err) {
    //         console.log('Error during Base64 download', err);
    //     });

}

/*
* Get a file
*/
function getFile(id, res, callback) {

    getFileMetaData(id, (metadata) => {

        let exportMimeType;
        switch (metadata.mimeType) {
            case MIMETYPE_PDF:
                exportMimeType = MIMETYPE_PDF;
                metadata.name += '.pdf'
                break;
            case MIMETYPE_GOOGLE_DOCUMENT:
                exportMimeType = MIMETYPE_MSWORD;
                metadata.name += '.docx'
                break;
            case MIMETYPE_GOOGLE_SPREADSHEET:
                exportMimeType = MIMETYPE_EXCEL;
                metadata.name += '.xlsx'
                break;
            default:
                return;
                break;
        }

        //Response headers
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'Content-Disposition': "attachment;filename='" + metadata.name + "'",
            'Content-Type': exportMimeType
        });

        if (metadata.mimeType == MIMETYPE_PDF) {
            gdrive.files.get({
                auth: oauthclient,
                fileId: id,
                alt: 'media'
            })
                .on('error', function (err) {
                    console.log('Error downloading PDF', err);
                }).pipe(res);
        } else {
            if (exportMimeType != null) {
                gdrive.files.export({
                    auth: oauthclient,
                    fileId: id,
                    mimeType: exportMimeType,
                    alt: 'media'
                })
                    .on('error', function (err) {
                        console.log('Error exporting google document as MimeType=' + exportMimeType, err);
                    }).pipe(res);
            }
        }
    });
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
    return MIMETYPE_FOLDER;
}

/*
*Get root ID for MSC Google Drive
*/
function getROOT_ID() {
    return ROOT_ID;
}

/*
* Exports
*/
module.exports = {
    getFile: getFile,
    getFileBase64: getFileBase64,
    getFileMetaData: getFileMetaData,
    getFolderMimeType: getFolderMimeType,
    getRoot: getRoot,
    getROOT_ID: getROOT_ID,
    init: init,
    listFilesByFolder: listFilesByFolder,
    setOAuthClient: setOAuthClient
};