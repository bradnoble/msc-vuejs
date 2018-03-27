var cfenv = require("cfenv"),
  appEnv = cfenv.getAppEnv(),
  dotenv = require('dotenv').config(),
  express = require('express'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  jsonParser = bodyParser.json(),
  json2csv = require('json2csv'),
  opts = (process.env.VCAP_SERVICES) ? {vcapServices: JSON.parse(process.env.VCAP_SERVICES)} : {url: process.env.url},
  env = (process.env.mode) ? process.env.mode : 'prod' // are we in dev mode?
  ;

// Initialize Cloudant
var cloudant = require('cloudant')(opts);
var db = (env == 'dev') ? cloudant.db.use("msc-dev") : cloudant.db.use("msc");

// Create a new Express application.
var app = express();
var http = require('http').Server(app);

// console.log(JSON.parse(process.env.USERS));

http.listen(appEnv.port, "0.0.0.0", function() {
  console.log("server starting on " + appEnv.url);     // print a message when the server starts listening
});

// auth
var passport = require('passport'),
  Strategy = require('passport-http').BasicStrategy,
  users = require('./lib/auth.js');

app.use(express.static(__dirname + '/public'));

//nothing to be done - call callback
passport.serializeUser(function(user, done) {
  // console.log('serializeUser');
  // console.log('user', user);
  done(null, user);
});

//nothing to be done - call callback
passport.deserializeUser(function(obj, done) {
  // console.log('deserializeUser');
  done(null, obj);
});

var sess = {
  secret: 'keyboard cat',
  cookie: {},
  resave: false, // https://github.com/expressjs/session#options
  saveUninitialized: false 
};

app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());

passport.use(users.passportStrategy());


app.get('/logout', function(req, res){
  // console.log('session', req.session);
  // console.log('user', req.user);
  req.session.loggedOut = true;
  //req.logout();
  // req.session.destroy(function (err) {
  //   if (err) { return next(err); }
  //   // The response should indicate that the user is no longer authenticated.
  //   return res.send({ authenticated: req.isAuthenticated() });
  // });
   res.redirect('/');
});

app.get('/admin', 
  users.auth,
  function(req, res){
    //db.view(designname, viewname, [params], [callback])
    db.view('app', 'householdsAndPeople', {'include_docs': true}, function(err, resp){
      if (!err) {
        var mapped = function(data){
          return data.rows.map(function(row) {
            return row.doc; // this is the entire payload
          });
        };
        // add people to the household
        var docs = mapped(resp);
        var households = [];
        var people = {};
        for (i = 0; i < docs.length; i++) { 
          if(docs[i].type == 'person'){
            // build an object that holds objects that hold arrays of people
            if(!people[docs[i].household_id]){
              people[docs[i].household_id] = [];
            }
            people[docs[i].household_id].push(docs[i]);
          } else if (docs[i].type == 'household') {
            households[i] = docs[i];
          }
          // console.log(people);
        }
        for (i = 0; i < households.length; i++) { 
          var household_id = households[i]._id;
          households[i].people = [];
          households[i].people = people[household_id];
        }
        // console.log(docs[1]);
        res.send(households);
      }
    });
  }
);


app.get('/getEmails', 
  users.auth,
  function(req, res){

    var params = (req.query.statuses) ? req.query.statuses : null;
    var opts = {};
    if(params){
      console.log(params);
      console.log(params.split(','));
      console.log('params length', params.length);
      opts.keys = params.split(',');
    } 

    // get the results of the API call
    db.view('app', 'emails', opts, function(err, resp){
      if (!err) {
        // console.log(resp);
        res.send(resp);
      } 
      else {
        console.log('error', err)        
        res.send(err);
      }
    });
  }
);

app.get('/list', 
  users.auth,
  function(req, res){
    //db.view(designname, viewname, [params], [callback])
    db.view('app', 'householdsAndPeople', {'include_docs': true}, function(err, resp){
      if (!err) {
        var mapped = function(data){
          return data.rows.map(function(row) {
            return row.doc; // this is the entire payload
          });
        };
        // add people to the household
        var docs = mapped(resp);
        var households = {};
        var people = [];
        for (i = 0; i < docs.length; i++) { 
          if(docs[i].type == 'person' && docs[i].first && docs[i].last && docs[i].status != 'deceased' && docs[i].status != 'non-member'){
            // build an object that holds objects that hold arrays of people
            people.push(docs[i]);
          } else if (docs[i].type == 'household') {
            households[docs[i]._id] = docs[i];
          }
          // console.log(people);
        }
        for (i = 0; i < people.length; i++) { 
          // connect the household info to the person
          people[i].household = households[people[i].household_id]
        }
        // console.log(docs[1]);
        res.send(people);
      }
    });
  }
);

app.get('/getPeopleForCSV', 
  function(req, res){

      db.view('app', 'householdsAndPeople', {'include_docs': true}, function(err, resp){
        if(!err){

          var households = {};
          var people = [];
          var rows = [];
          var z = 0;
          var people_fields = [];
          var household_fields = [];
          var whitelist = ['_id', '_rev', 'type'];

          var mapped = function(data){
            return data.rows.map(function(row) {
              if(row.doc.type == 'household'){
                // see 'household_phone' comment below
                row.doc.household_phone = row.doc.phone;
                households[row.doc._id] = row.doc;
              }
              if(row.doc.type == 'person' && row.doc.status != 'deceased' && row.doc.status != 'non-member' && row.doc.status != 'guest' && row.doc.status != ''){
                people[z] = row.doc;
                if(people_fields.length == 0 && row.doc.household_id){
                  people_fields = Object.keys(row.doc);
                  // console.log(people_fields);
                }
                z++;              
              }
              return row.doc; 
            });
          };

        var data = mapped(resp);
        var household_fields = ['name', 'label_name', 'street1', 'street2', 'city', 'state', 'zip', 'household_phone', 'mail_list', 'mail_news'];
        // household_phone
        // note that I'm using 'household_phone' here in household_fields
        // people and households both have 'phone' fields and as such was presenting people phones as household phones
        // at line 160 I work in 'household_phone' to replace 'phone' for households

        var fields = people_fields.concat(household_fields);

          // associate the households to the person
          for (i = 0; i < people.length; i++) { 
            rows[i] = people[i];
            var household = households[people[i].household_id];
            if(household){
              for(j in household_fields){
                rows[i][household_fields[j]] = household[household_fields[j]];
              }
            }
          }

          console.log(fields);
//          console.log(rows);

          // http://stackoverflow.com/questions/35138765/download-csv-file-node-js/35140031
          json2csv({ data: rows, fields: fields }, function(err, csv) {
            res.set('Content-disposition', 'attachment; filename=people.csv');
            res.set('Content-Type', 'text/csv');
            res.status(200).send(csv);
          });
        } else {
          console.log(err);
        }
      });
  }
);

app.get('/getHousehold/', 
  users.auth,
  function(req, res){
    var role = req.user.role[0].value;
    if(role === 'admin'){
      // the factory passes the id of the document as a query parameter
      var id = req.query.id;
      db.get(id, function(err, doc){
        if (!err) {
          // get the people of this householdsAndPeople
          db.view(
            'app', 
            'join_people_to_household', 
            {
              'include_docs': true,
              'key': id
            }, 
            function(err, people){
              if (!err) {
                var mapped = function(data){
                  return data.rows.map(function(row) {
                    return row.doc; // this is the entire payload
                  });
                };
                // add people to the household
                doc.people = mapped(people);
                res.send(doc);
              }
            }
          );
          //console.log(doc);
          //res.send(doc);
        }
      });
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." }); 
    }
});

app.post('/postHousehold', 
  users.auth,
  jsonParser, 
  function(req, res){
    var role = req.user.role[0].value;
    if(role === 'admin'){

      var household = req.body,
        newPeople = [];
      // bulk insert people
      // todo: make sure this works when a household has zero people, even though that's very unlikely
      // might even wanna prevent saving a household until there's a person
      if(household.people.length > 0){
        // update people in bulk
          db.bulk({docs:household.people}, function(err, docs) {
          //db.insert(household.people[1], function(err, docs){
          if(!err){
            console.log(docs);
            // update the new people object with response, including _rev
            newPeople = docs;
            // don't push the people object into the household, b/c people are stored separately
            delete household.people;
            // update household
            db.insert(household, function(err, doc){
              if (!err) {
                console.log('success updating household, will add people to response next');
                // make sure there are no people in the household object
                doc.people = [];
                // append the updated people object to the household before sending the response
                doc.people = newPeople;
                console.log(doc);
                res.send(doc);
              }
              else {
                console.log('household:' + err.reason);
              }
            });
          } else {
            console.log('people: ' + err.reason);
          }
        });
      }
    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." }); 
    }
});

app.get('/getSignups', 
  users.auth,
  function(req, res){
    var role = req.user.role[0].value;
    if(role === 'member' || role === 'admin'){
      // console.log(role);
      db.view('app', 'signups', {'include_docs': true}, function(err, doc){
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." }); 
    }
});

app.get('/getSignupChairs', 
  users.auth,
  function(req, res){
    var role = req.user.role[0].value;
    if(role === 'admin'){
      // console.log(role);
      db.view('app', 'signups', {'include_docs': true}, function(err, doc){
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." }); 
    }
});

app.get('/getSignup/', 
  users.auth,
  function(req, res){
    var role = req.user.role[0].value;
    if(role === 'member' || role === 'admin'){
      // console.log(role);
      // the factory passes the id of the document as a query parameter
      var doc = req.query.id;
      db.get(doc, function(err, doc){
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." }); 
    }
});

app.get('/editSignup/', 
  users.auth,
  function(req, res){
    var role = req.user.role[0].value;
    if(role === 'admin'){
      // console.log(role);
      // the factory passes the id of the document as a query parameter
      var doc = req.query.id;
      db.get(doc, function(err, doc){
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." }); 
    }
});

app.get('/getPeople', 
  function(req, res){
      db.view('app', 'people', {'include_docs': true}, function(err, resp){
        var mapped = function(data){
          return data.rows.map(function(row) {
            var trimmed = {};
            trimmed._id = row.doc._id;
            trimmed.status = row.doc.status;
            trimmed.household_id = row.doc.household_id;
            trimmed.name = row.doc.first + ' ' + row.doc.last;
            return trimmed; 
          });
        };

        var people = mapped(resp);
        if (!err) {
          res.send(people);
        }
        else {
          console.log(err);
        }
      });
  }
);

app.post('/update', jsonParser, function(req, res){
  var doc = req.body;
  db.insert(doc, function(err, doc){
    if (!err) {
      res.send(doc);
    }
    else {
      console.log('error saving doc');
    }
  });
});








/*
TESTS

cloudant.db.list(function(err, allDbs) {
  console.log('All my databases: %s', allDbs.join(', '))
});

app.get('/allDatabases', function(req, res){
  cloudant.db.list(function(err, data) {
    res.send(data);
  });
});

var ddoc = 'app',
  id = '_design/' + ddoc,
  views = {
    "householdsAndPeople": {
        "map": "function (doc) {\n    if (doc.type == \"household\"){\n      emit([doc.type, doc.name, doc._id], 1);\n    }\n    if(doc.type == \"person\"){\n      emit([doc.type, doc.household_id, doc.first], 1);\n    }\n  }"
    },
    "join_people_to_household": {
        "map": "function (doc) {\n    if (doc.type == \"person\" && doc.household_id){\n      emit(doc.household_id, 1);\n    }\n  }"
    },
    "signups": {
        "map": "function (doc){\n    var split = doc.arrive.split(\"T\");\n    split = split[0].split(\"-\");\n\n    // take out leading zeros from month and day here before parseInt\n    // http://stackoverflow.com/questions/8763396/javascript-parseint-with-leading-zeros\n\n    var arrive = [\n      parseInt(split[0], 10),\n      parseInt(split[1], 10),\n      parseInt(split[2], 10)\n      ];\n    if(doc.type == 'signup'){\n      emit(arrive, 1);\n    }\n  }"
    },
    "people": {
        "map": "function (doc) {\n    if (doc.type == \"person\"){\n      emit(doc._id, 1);\n    }\n  }"
    },
    "emails": {
           "map": "function(doc){ if(doc.type == \"person\" && doc.email && doc.status && doc.first && doc.last){ emit(doc.status, [doc.email, doc.first + ' ' + doc.last]) } }"    }
  };

var compareViews = function(){
  var stringBodyViews = '', // this will hold the views that are in the db
    stringViews = ''; // this will hold the views that are in this file

  // steps
  // 1. make sure we're in dev mode (ie, working locally)
  // dev mode is set in the .env file as `dev=true`
  // in production, `dev` will not exist in the env vars
  // note: @ top of file, `dev` is set depending on what's in .env
  if(!dev)
    return true;
  // 2. compare the views in this file with the views in the db
  // 3. if they're different, update the views in the db and...
  // 4. retry the endpoint


    // 2. compare the views in the db with the views in this doc
    // first get the view
    db.get('_design/app', {}, function(err, body) {
      if(!err){

        // in order to compare,
        // turn both view objects to strings and then remove all whitespace
        // body.views first
        stringBodyViews = JSON.stringify(body.views);
        stringBodyViews.replace(/\s/g,'');

        // views second
        stringViews = JSON.stringify(views);
        stringViews.replace(/\s/g,'');

        // if they don't match... 
        if(stringBodyViews != stringViews){
          console.log('views are NOT equal');
          body.views = views;
          // 3. update the db
          db.insert(body, function(err, body){
            if(!err){
              console.log('views updated!', body);
              return false;
            }
          });
        } 
        else {
          console.log('views are equal');
          return true;
        }

      }
    });
};



*/