var cfenv = require("cfenv"),
  appEnv = cfenv.getAppEnv(),
  dotenv = require('dotenv').config(),
  express = require('express'),
  bodyParser = require('body-parser'),
  jsonParser = bodyParser.json(),
  Json2csvParser = require('json2csv').Parser,
  Combinatorics = require('js-combinatorics'),
  opts = (process.env.VCAP_SERVICES) ? { vcapServices: JSON.parse(process.env.VCAP_SERVICES) } : { url: process.env.url },
  env = (process.env.mode) ? process.env.mode : 'prod' // are we in dev mode?
  ;

// Initialize Cloudant
var cloudant = require('@cloudant/cloudant')(opts);
var db = (env == 'dev') ? cloudant.db.use("msc-dev") : cloudant.db.use("msc");

// Create a new Express application.
var app = express();
var http = require('http').Server(app);

//Define base directory for application. Use it by referencing '__basedir'
global.__basedir = __dirname;
//console.log('base=' + __basedir);

// console.log(JSON.parse(process.env.USERS));

http.listen(appEnv.port, "0.0.0.0", function () {
  console.log("server starting on " + appEnv.url);     // print a message when the server starts listening
});

app.use(express.static(__dirname + '/public'));

/*
* BEGIN Authentication setup
*/

let session = require("express-session");
let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let flash = require('connect-flash');

app.use(session({
  cookie: {
    httpOnly: true,
    path: '/'
  },
  name: 'msc.sid',
  resave: false,
  saveUninitialized: true,
  secret: "madriverglen"
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

let authentication = require('authentication');

passport.use(new LocalStrategy(
  function (username, password, done) {
    authentication.users.exists(username, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.password == password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  authentication.users.findById(id, function (err, user) {
    if (user == null) {

    } else {
      delete user.password;
      done(err, user);
    }
  });
});

// function requireAuth (to, from, next) {
//   if (!authentication.users.isAuthenticated()) {
//     next({
//       path: '/',
//       query: { redirect: to.fullPath }
//     })
//   } else {
//     next()
//   }
// }

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/#/',
    failureRedirect: '/#/login',
    failureFlash: true
  })
);

app.get('/logout',
  function (req, res) {
    req.logout();
    res.redirect('/#/login');
  });

//Home page (authenticated)
app.get('/',
  authentication.users.isAuthenticated,
  (req, res) => {
  }
);

/*
* END Authentication setup
*/

/*
* BEGIN Resoures setup
*/

//Google Drive module
var gdrive = require('gdrive');
//OAuth client local module for Google API
gdrive.oauthclient.init();
//Google Drive API
gdrive.api.init();

/*
* END Resoures setup
*/

/*
* BEGIN List
*/

app.get('/search',
  authentication.users.isAuthenticated,
  function (req, res) {

    var q = req.query.q,
      q_array = (q) ? q.split(' ') : null,
      status = req.query.status,
      cmb,
      a,
      selector = {}
      ;

    if (status && status != 'all') {
      selector = {
        "status": {
          "$eq": status
        }
      };
    } else if (status && status == 'all') {
      selector = {
        "type": { "$eq": "person" },
        "$nor": [
          { "status": "deceased" },
          { "status": "guest" },
          { "status": "non-member" }
        ]
      };
    } else if (q) {
      console.log(q_array)
      if (q_array.length == 1) {
        selector = {
          "$or": [
            {
              "first": {
                "$regex": "^(?i)" + q_array[0] + ".*"
              }
            },
            {
              "last": {
                "$regex": "^(?i)" + q_array[0] + ".*"
              }
            }
          ]
        };
      } else {
        selector = {
          "$or": [
            {
              "$and": [
                { "first": { "$regex": "^(?i)" + q_array[0] + ".*" } },
                { "last": { "$regex": "^(?i)" + q_array[q_array.length - 1] + ".*" } }
              ]
            },
            {
              "$and": [
                { "first": { "$regex": "^(?i)" + q_array[q_array.length - 1] + ".*" } },
                { "last": { "$regex": "^(?i)" + q_array[0] + ".*" } }
              ]
            }
          ]
        };
      }
    }

    db.find(
      {
        "selector": selector,
        "fields": []
      }, function (err, data) {
        if (err) {
          throw err;
        }
        res.send(data)
      }
    );

    /*/
    // use js-combinatorics to create array combinations for the query
    cmb = Combinatorics.permutationCombination(q_array);
    var combos = cmb.toArray();
    /*/
  }
);

app.get('/list',
  authentication.users.isAuthenticated,
  function (req, res) {
    //db.view(designname, viewname, [params], [callback])
    db.view('app', 'householdsAndPeople', { 'include_docs': true }, function (err, resp) {
      if (!err) {
        var mapped = function (data) {
          return data.rows.map(function (row) {
            return row.doc; // this is the entire payload
          });
        };
        // add people to the household
        var docs = mapped(resp);
        var households = {};
        var people = [];
        var finalArray = [];

        for (i = 0; i < docs.length; i++) {
          if (docs[i].type == 'person' && docs[i].first && docs[i].last && docs[i].status != 'deceased' && docs[i].status != 'non-member') {
            // build an object that holds objects that hold arrays of people
            people.push(docs[i]);
          } else if (docs[i].type == 'household') {
            households[docs[i]._id] = docs[i];
          }
        }
        // connect the household info to the person
        // only if there's a household to connect a person to
        for (i = 0; i < people.length; i++) {
          if (households[people[i].household_id]) {
            people[i].household = households[people[i].household_id]
            finalArray.push(people[i]);
          }
        }
        res.send(finalArray);
      }
    });
  }
);

app.get('/getEmails',
  authentication.users.isAuthenticated,
  function (req, res) {

    var params = (req.query.statuses) ? req.query.statuses : null;
    var opts = {};

    console.log(req.query)

    if (params) {
      opts.keys = params;
    }
    /*
        if (params) {
          console.log(params);
          console.log(params.split(','));
          console.log('params length', params.length);
          opts.keys = params.split(',');
        }
    */
    // get the results of the API call
    db.view('app', 'emails', opts, function (err, resp) {
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

app.get('/getPeopleForCSV',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      var households = {},
        people = [],
        filename = '',
        datetime = new Date().toISOString(),
        fields = [
          "_id",
          "household_id",
          "first",
          "last",
          "status",
          "type",
          "email",
          "phone",
          "street1",
          "street2",
          "city",
          "state",
          "zip"
        ],
        blacklist = [
          "_id",
          "household_id",
          "type"
        ],
        status = req.query.status,
        selector_array = [
          { "status": { "$ne": "deceased" } },
          { "status": { "$ne": "non-member" } },
          { "status": { "$ne": "guest" } }
        ];

      if (status && status != 'all') {
        selector_array.push({ "status": { "$eq": status } });
      }

      db.find(
        {
          "selector": {
            "$or": [
              {
                "$and": [
                  {
                    "type": {
                      "$eq": "person"
                    }
                  },
                  {
                    "$and": selector_array
                  }
                ]
              },
              {
                "type": {
                  "$eq": "household"
                }
              }
            ]
          },
          "limit": 600,
          "fields": fields
        }, function (err, data) {
          if (err) {
            throw err;
          }
          // build an array of people, and a dictionary of households
          for (var i = 0; i < data.docs.length; i++) {
            if (data.docs[i].type == 'household') {
              data.docs[i].household_phone = data.docs[i].phone;
              households[data.docs[i]._id] = data.docs[i];
            } else if (data.docs[i].type == 'person') {
              people.push(data.docs[i]);
            }
          }

          // associate households from the dictionary to each person in the people array
          for (var i = 0; i < people.length; i++) {
            let household = households[people[i].household_id];
            if (household) {
              Object.assign(people[i], household);
            }
          }

          // remove unnecessary fields to make the spreadsheet pretty
          for (var i = 0; i < blacklist.length; i++) {
            var index = fields.indexOf(blacklist[i]);
            if (index !== -1) {
              fields.splice(index, 1);
            }
          }

          filename = 'MSC-Membership-List-' + status + '-' + datetime;

          // leading zeros get trimmed by Numbers/Excel when importing CSVs
          // the zeros are there in the CSV, though
          // here's how to fix it, from inside Numbers/Excel:
          // https://discussions.apple.com/thread/5303970?answerId=5303970021#5303970021
          const json2csvParser = new Json2csvParser({ fields });
          const csv = json2csvParser.parse(people);

          res.set('Content-disposition', 'attachment; filename=' + filename + '.csv');
          res.set('Content-Type', 'text/csv');
          res.status(200).send(csv);

        }
      );
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  }
);

app.get('/getPerson/',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      // the factory passes the id of the document as a query parameter
      var id = req.query.id;
      db.get(id, function (err, doc) {
        if (!err) {
          res.send(doc);
        } else {
          return res.status(404).json(
            {
              "error": "Sorry, we don't have a record of this person."
            }
          );
        }
      });
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  }
);

app.get('/getHousehold/',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    // both admins and members can see these results
    if (role) {
      // the factory passes the id of the document as a query parameter
      var id = req.query.id;
      db.get(id, function (err, doc) {
        if (!err) {
          // get the people of this householdsAndPeople
          db.view(
            'app',
            'join_people_to_household',
            {
              'include_docs': true,
              'key': id
            },
            function (err, people) {
              if (!err) {
                var mapped = function (data) {
                  return data.rows.map(function (row) {
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
        } else {
          return res.status(404).json({ "error": "Sorry, we don't have a household with that id." });
        }
      });
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

/*
* END List
*/

/*
* BEGIN Admin
*/

// TODO: ADD ADMIN ONLY AUTH HERE
app.get('/admin',
  authentication.users.isAuthenticated,
  function (req, res) {
    //db.view(designname, viewname, [params], [callback])
    db.view('app', 'householdsAndPeople', { 'include_docs': true }, function (err, resp) {
      if (!err) {
        var mapped = function (data) {
          return data.rows.map(function (row) {
            return row.doc; // this is the entire payload
          });
        };
        // add people to the household
        var docs = mapped(resp);
        var households = [];
        var people = {};
        for (i = 0; i < docs.length; i++) {
          if (docs[i].type == 'person') {
            // build an object that holds objects that hold arrays of people
            if (!people[docs[i].household_id]) {
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

app.post('/postPerson',
  authentication.users.isAuthenticated,
  jsonParser,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      var person = req.body;
      db.insert(person, function (err, doc) {
        if (!err) {
          console.log('success updating person, will add people to response next');
          console.log(doc);
          res.send(doc);
        }
        else {
          console.log('household:' + err.reason);
        }
      });
    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.post('/postHousehold',
  authentication.users.isAuthenticated,
  jsonParser,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {

      var household = req.body;

      // if we're deleting a household, we should first delete the people
      if (household._deleted == true) {
        // using cloudant query means we don't have to pre-build our indexes
        // which means I don't have to worry about keeping mapreduce code in sync 
        // across the dev and prod database(s), and can instead just update views here
        db.find(
          {
            "selector": {
              "household_id": {
                "$eq": household._id
              }
            },
            "fields": [
              "_id",
              "_rev"
            ]
          }, function (err, data) {
            if (err) {
              throw err;
            }
            var people = [];

            console.log('Found %d people in this household', data.docs.length);

            for (var i = 0; i < data.docs.length; i++) {
              data.docs[i]._deleted = true;
              people.push(data.docs[i]);
            }

            if (people.length > 0) {
              db.bulk({ docs: people }, function (err, docs) {
                if (!err) {
                  console.log('deleted this many people', people.length);
                } else {
                  console.log('error deleting people', err.reason);
                }
              });
            }
          });
      }

      // update the household      
      db.insert(household, function (err, doc) {
        if (!err) {
          console.log('success updating household');
          res.send(doc);
        }
        else {
          console.log('household:' + err.reason);
          res.status(401).json({ "error": err.reason });
        }
      });

    } else {
      // console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.post('/postHouseholdOld',
  authentication.users.isAuthenticated,
  jsonParser,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {

      var household = req.body,
        newPeople = [];
      // bulk insert people
      // todo: make sure this works when a household has zero people, even though that's very unlikely
      // might even wanna prevent saving a household until there's a person
      if (household.people.length > 0) {
        // update people in bulk
        db.bulk({ docs: household.people }, function (err, docs) {
          //db.insert(household.people[1], function(err, docs){
          if (!err) {
            console.log(docs);
            // update the new people object with response, including _rev
            newPeople = docs;
            // don't push the people object into the household, b/c people are stored separately
            delete household.people;
            // update household
            db.insert(household, function (err, doc) {
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

/*
* END Admin
*/

/*
* BEGIN Signup
*/

app.get('/getSignups',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'member' || role === 'admin') {
      // console.log(role);
      db.view('app', 'signups', { 'include_docs': true }, function (err, doc) {
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
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      // console.log(role);
      db.view('app', 'signups', { 'include_docs': true }, function (err, doc) {
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
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'member' || role === 'admin') {
      // console.log(role);
      // the factory passes the id of the document as a query parameter
      var doc = req.query.id;
      db.get(doc, function (err, doc) {
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
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      // console.log(role);
      // the factory passes the id of the document as a query parameter
      var doc = req.query.id;
      db.get(doc, function (err, doc) {
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
  function (req, res) {
    db.view('app', 'people', { 'include_docs': true }, function (err, resp) {
      var mapped = function (data) {
        return data.rows.map(function (row) {
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

app.post('/update', jsonParser, function (req, res) {
  var doc = req.body;
  db.insert(doc, function (err, doc) {
    if (!err) {
      res.send(doc);
    }
    else {
      console.log('error saving doc');
    }
  });
});

/*
* END Signup
*/

/*
* BEGIN Resources
*/

//Displays root folders from MSC Google Drive
app.get('/resources',
  authentication.users.isAuthenticated,
  (req, res) => {
    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());
    gdrive.api.getRoot((files) => {
      res.send(files);
    });
  });

// Download Google Drive file
app.get('/resources/download/:id',
  authentication.users.isAuthenticated,
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.id !== undefined) {

      //Get file metadata w/ filename for d/l
      // let fileName;
      // gdrive.api.getFileMetaData(req.params.id, (metadata) => {
      //   //Get file name from metadata
      //   fileName = metadata.name;

      //Get file contents and d/l
      gdrive.api.getFile(req.params.id, res, () => {
        res.send();
        res.end();
      });
      // });
    } else {
      res.end();
    }

  });

//Export file
app.get('/resources/export/:id',
  authentication.users.isAuthenticated,
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.id !== undefined) {

      //Get file metadata w/ filename for d/l
      let fileName;
      gdrive.api.getFileMetaData(req.params.id, (metadata) => {
        fileName = metadata.name;

        //Setup response for file d/l
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'X-Requested-With',
          'Content-Disposition': "attachment;filename='" + fileName + "'",
          'Content-Type': 'application/pdf'
        });

        //Get file contents and d/l
        gdrive.api.getFile(req.params.id, res, () => {
          console.log(fileName + ' sent in response');
          res.send();
          res.end();
        });
      });
    } else {
      res.end();
    }

  });

// Resources: Endpoint for retrieving list of GDrive metadata for a folder
app.get('/resources/:folderId', (req, res) => {

  gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

  if (req.params.folderId !== undefined) {
    gdrive.api.listFilesByFolder(req.params.folderId, (files) => {
      res.send(files);
    });
  } else {
    res.send(null);
  }

});

//Resources: Endpoint for retrieving list of GDrive metadata based upon search text
app.get('/resources/search/:searchText', (req, res) => {

  gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

  if (req.params.searchText !== undefined) {
    gdrive.api.findFiles(req.params.search, (files) => {
      res.send(files);
    });
  } else {
    res.send(null);
  }

});

//Resources: Endpoint for retrieving Base64 file content
app.get('/resources/view/:id', (req, res) => {

  gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

  if (req.params.id !== undefined) {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'X-Requested-With',
      'Content-Type': 'application/pdf'
    });

    gdrive.api.getFileBase64(req.params.id, res, () => {

      console.log('Base64 file sent in response');
      res.send();
      res.end();

    });
  } else {
    res.end();
  }

});

/*
* END Resources
*/
