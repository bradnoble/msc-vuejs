//List of user information
let users = [
    { id: 1, username: 'member', password: 'member', roles: 'user', token: '14344b97-3f75-40d9-8786-bb7a55ec9d7f' },
    { id: 2, username: 'admin', password: 'admin', roles: 'admin', token: 'e831c0d2-d0fa-41ca-95f6-fab8dccfc83b' }
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
    } else if (callback) {
        callback('User does not exits', null);
    }
}

/*
* Find user by token
*/
function findByToken(token , callback) {
    let user = users.find(function (user) {
        return (user.token == token);
    });

    if (user) {
        //Never explose PW
        delete user.password;
        callback(null, user);
    } else if (callback) {
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
function isAuthenticated(req, res, callback) {

    if (req.headers['api-key']) {
        return callback();
    } else {
        res.redirect('/login');
    }

    // if (req.user && validateId(req.user.id)) {
    //     //res.locals.isAuthenticated = true;
    //     return callback();
    // } else {
    //     //res.locals.isAuthenticated = false;
    //     res.redirect('/login');
    // }
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

    return true;
    //TBD-use header api-key to find user and determine role

    findByToken(token, function (err, user) {
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
    });
}

/*
* Return list of roles for current user
*/
function getRoles(id) {
    let user = findById(id);
    if (user && user.roles) {
        return user.roles;
    } else {
        return null;
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
    isInRole: isInRole,
    getRoles: getRoles
};