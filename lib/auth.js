var passport = require('passport'),
  Strategy = require('passport-http').BasicStrategy;

var passportStrategy = function(){
  var records = process.env.USERS;

  return new Strategy(
    function(username, password, cb) {
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
	auth: passport.authenticate('basic', { session: false })
};
