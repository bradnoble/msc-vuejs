let users = [
    { id: 1, username: 'member', password: '137schusspass', roles: 'user' },
    { id: 2, username: 'admin', password: '137schusspassadmin', roles: 'admin' }
];

let roles = [
    'admin',
    'user'
];

function init() {
}

function findById(id, callback) {
    let user = users.find(function (user) {
        return (user.id == id);
    });

    if (user != null) {
        callback(null, user);
    } else {
        callback(null, null);
    }
}

function exists(username, callback) {

    let user = users.find(function (user) {
        return (user.username == username);
    });

    if (user != null) {
        callback(null, user);
    } else {
        callback(null, null);
    }
}

function isAuthenticated(req, res, next) {

    if (validateId(req.user.id)){
        res.locals.isAuthenticated=true;
        return next();
    } else{
        res.locals.isAuthenticated=false;
        res.redirect('/');
    }
}

function validateId(id) {
    let user = users.find(function (user) {
        return (user.id == id);
    });

    return (user.hasOwnProperty('id'));
}

function isInRole(id, role) {
    //TBD
}

/*
* Exports
*/
module.exports = {
    exists: exists,
    findById: findById,
    init: init,
    isAuthenticated: isAuthenticated,
    isInRole: isInRole
};