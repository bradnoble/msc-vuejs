var passport = require('passport'),
//  Strategy = require('passport-http').BasicStrategy;
  Strategy = require('passport-local');
  
var passportStrategy = function(){
  var records = JSON.parse(process.env.USERS);

  console.log('Strategy', Strategy);

  return new Strategy(
    {
      session: true,
      passReqToCallback: false
    },
    function(username, password, cb) {
      console.log('req', req);
      console.log('username', username, cb);
      for (var i = 0, len = records.length; i < len; i++) {
        var record = records[i];
        if (record.username === username && record.password === password) {
          return cb(null, record);
        }
      }      
      return cb(null, false);
    });
}

module.exports = {
  passportStrategy: passportStrategy,
	auth: passport.authenticate('local', { session: true })
};
