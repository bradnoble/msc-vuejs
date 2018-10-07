//List of user information
let users = [
    { id: 1, username: 'member', password: '137schusspass', roles: 'user' },
    { id: 2, username: 'admin', password: '137schusspassadmin', roles: 'admin' }
];

//User roles
let roles = [
    'admin',
    'user'
];

function init() {
}

/*
* Find user by ID
*/
function findById(id, callback) {
    let user = users.find(function (user) {
        return (user.id == id);
    });

    if (user) {
        //Never explose PW
        delete user.password;
        callback(null, user);
    } else {
        callback('User does not exits', null);
    }
}

/*
* Determine if a user exists
*/
function exists(username, callback) {

    let user = users.find(function (user) {
        return (user.username == username);
    });

    callback(null, user);
}

/*
* Determine if a user is authenticated
*/
function isAuthenticated(req, res, next) {

    if (req.user && validateId(req.user.id)) {
        res.locals.isAuthenticated = true;
        return next();
    } else {
        res.locals.isAuthenticated = false;
        res.redirect('/login');
    }
}

/*
* Validate user ID
*/
function validateId(id) {
    let user = users.find(function (user) {
        return (user.id == id);
    });

    return (user.hasOwnProperty('id'));
}

/*
* Determine if a user is in one or more specificed roles
*/
function isInRole(id, roles) {
    let user = findById(id);
    if (user) {
        roles.forEach(role => {
            if (user.roles.includes(role)) {
                return true;
            }
        });
        return false;
    } else {
        return false;
    }
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