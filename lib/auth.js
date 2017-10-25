var passport = require('passport'),
  Strategy = require('passport-http').BasicStrategy;
  
var passportStrategy = function(){
  var records = JSON.parse(process.env.USERS);

  // console.log('Strategy', Strategy);

  return new Strategy(
    {
      session: true,
      passReqToCallback: true
    },
    function(req, username, password, cb) {
      if (req.session.loggedOut){
        req.session.loggedOut = false;
        return cb(null, false);
      }
      // console.log('req', req);
      // console.log('username', username, cb);
      for (var i = 0, len = records.length; i < len; i++) {
        var record = records[i];
        // debugger;
        if (record.username === username && record.password === password) {
          // debugger;
          return cb(null, record);
        }
      }      
     return cb(null, false);
    });
}

module.exports = {
  passportStrategy: passportStrategy,
	auth: passport.authenticate('basic', { session: true })
};
